import { describe, expect, it } from 'vitest'
import type { CombatantSetup, DenbornBattle, RoundAction } from '../../battle/denborn-battle'
import { bag, enemy, move, player, round, seedNumber, start } from '../../battle/test-kit'
import type { BagEffect } from '../../game-rules/bag-effects'
import { type Said, type Telling, roundScript, sentence, standingAfter } from './round-script'

/** A round's log as it leaves the table: each Pokémon named by its id. */
const told = (battle: DenbornBattle, result: ReturnType<typeof round>) => ({
  log: result.log.map((line) => line.replace(/p[12][a-f]?: [PE][1-6]/g, (identity) => battle.whoIs(identity) ?? identity)),
  events: result.events,
})
/** Plays a round and gives its script, with how everyone stood before and stands after. */
function play(battle: DenbornBattle, actions: Record<string, RoundAction> = {}) {
  const before = battle.combatants()
  const script = roundScript(told(battle, round(battle, actions)))
  return { before, script, after: battle.combatants(), keys: script.steps.flatMap((step) => (step.said ? [step.said.key] : [])) }
}
const HEAL: BagEffect = { heal: 20 }

describe('a round as it is told', () => {
  it('says the move, shows who uses it and who it is aimed at, then the hit', () => {
    const battle = start([player('one', 'Machamp', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])])
    const { script, before } = play(battle, { one: move('tackle', 'foe') })
    const [used, hit] = script.steps
    expect(used).toMatchObject({ said: { key: 'moveUsed', pokemon: ['one'], move: 'tackle' }, show: ['one', 'foe'], motion: { attack: 'one' } })
    expect(hit).toMatchObject({ show: ['foe'], motion: { hit: 'foe' } })
    expect(hit?.change?.hp).toBeLessThan(before.find((combatant) => combatant.id === 'foe')?.hp ?? 0)
  })

  it('ends, step after step, exactly where the fight stands: HP, status, the downed and the gone', () => {
    // A long exchange with poison, a status move and Pokémon going down, on several seeds.
    for (let seed = 1; seed <= 6; seed++) {
      const battle = start(
        [player('one', 'Machamp', ['tackle', 'toxic'], { hp: 30 }), player('two', 'Jolteon', ['thunderwave', 'thundershock'])],
        [enemy('foe', 'Snorlax', ['bodyslam', 'recover']), enemy('mob', 'Arbok', ['poisonsting'], { hp: 20 })],
        { seed: seedNumber(seed) },
      )
      const plans: Record<string, RoundAction>[] = [
        { one: move('toxic', 'foe'), two: move('thunderwave', 'mob'), foe: move('bodyslam', 'one'), mob: move('poisonsting', 'two') },
        { one: move('tackle', 'mob'), two: move('thundershock', 'mob'), foe: move('bodyslam', 'one'), mob: move('poisonsting', 'one') },
        { two: move('thundershock', 'foe'), foe: move('recover'), mob: move('poisonsting', 'two') },
        { two: move('thundershock', 'foe'), foe: move('bodyslam', 'two') },
      ]
      for (const plan of plans) {
        if (battle.ended) break
        const actions = Object.fromEntries(Object.entries(plan).filter(([id]) => battle.request(id).canAct && !battle.request(id).forced))
        const { before, script, after } = play(battle, actions)
        const shown = standingAfter(before, script.steps, script.steps.length)
        const facts = (all: typeof after) => all.map(({ id, hp, status, downed, dead, stacks }) => ({ id, hp, status, downed, dead, stacks }))
        expect(facts(shown)).toEqual(facts(after))
        expect(script.unknown).toEqual([])
      }
    }
  })

  it('says what a status, a stat change, a miss and what stops a Pokémon are', () => {
    const battle = start(
      [player('one', 'Machamp', ['swordsdance', 'growl']), player('two', 'Jolteon', ['thunderwave'])],
      [enemy('foe', 'Snorlax', ['tackle'], { status: 'slp' }), enemy('mob', 'Geodude', ['tackle'])],
    )
    const first = play(battle, { one: move('swordsdance'), two: move('thunderwave', 'mob') })
    expect(first.keys).toEqual(expect.arrayContaining(['moveUsed', 'boost.atk.2', 'immune', 'cant.slp']))
    // Growl is aimed at both foes: a result on one of several says on whom.
    const second = play(battle, { one: move('growl') })
    expect(second.script.steps.filter((step) => step.said?.key === 'boost.atk.-1').map((step) => step.said?.pokemon)).toEqual([['foe'], ['mob']])
  })

  it('says what begins on the field and on each side, a charging turn and a substitute', () => {
    const battle = start(
      [player('one', 'Machamp', ['reflect', 'substitute']), player('two', 'Venusaur', ['electricterrain', 'solarbeam'])],
      [enemy('foe', 'Chansey', ['spikes', 'lightscreen'])],
    )
    const first = play(battle, { one: move('reflect'), two: move('electricterrain'), foe: move('spikes') })
    // The enemy's Spikes lie on the players' side: "your team", for a player.
    expect(first.keys).toEqual(expect.arrayContaining(['side.reflect.start.party', 'field.electricterrain.start', 'side.spikes.start.party']))
    const second = play(battle, { one: move('substitute'), two: move('solarbeam', 'foe'), foe: move('lightscreen') })
    expect(second.keys).toEqual(expect.arrayContaining(['substitute.start', 'prepare.solarbeam', 'side.lightscreen.start.foes']))
  })

  it('tells Denborn\'s own events in the owner\'s words: down, hit while down, the Bag', () => {
    const battle = start([player('one', 'Machamp', ['tackle'], { hp: 1 }), player('two', 'Chansey', ['tackle'], { hp: 40 })], [enemy('foe', 'Jolteon', ['tackle'])])
    const first = play(battle, { foe: move('tackle', 'one'), two: bag('medicine', 'two', HEAL) })
    expect(first.keys).toEqual(expect.arrayContaining(['own.bagUsed', 'own.downed']))
    expect(first.script.steps.find((step) => step.said?.key === 'own.bagUsed')?.said).toEqual({ key: 'own.bagUsed', pokemon: ['two', 'two'], item: 'medicine' })
    const second = play(battle, { foe: move('tackle', 'one') })
    expect(second.keys).toEqual(expect.arrayContaining(['own.hitWhileDown', 'own.agonizing']))
  })

  it('names no kind of line it has never heard of, over many rounds of many moves', () => {
    const moves = ['tackle', 'thunderwave', 'toxic', 'swordsdance', 'protect', 'raindance', 'sandstorm', 'leechseed', 'confuseray', 'hyperbeam', 'solarbeam', 'reflect', 'stealthrock', 'earthquake', 'substitute', 'rest', 'doubleteam', 'flamethrower', 'gigadrain', 'takedown', 'fly', 'haze', 'trickroom', 'electricterrain']
    const species = ['Machamp', 'Jolteon', 'Snorlax', 'Venusaur', 'Gengar', 'Dragonite']
    const unknown = new Set<string>()
    for (let seed = 1; seed <= 12; seed++) {
      const pick = (offset: number): string[] => [0, 1, 2, 3, 4, 5].map((step) => moves[(seed * 7 + offset * 5 + step * 3) % moves.length] ?? 'tackle')
      const side = (prefix: string, build: (id: string, species: string, moves: string[]) => CombatantSetup, offset: number): CombatantSetup[] =>
        [0, 1, 2].map((index) => build(`${prefix}${index}`, species[(seed + offset + index) % species.length] ?? 'Machamp', [...new Set(pick(offset + index))]))
      const battle = start(side('hero', player, 0), side('foe', enemy, 3), { seed: seedNumber(seed) })
      for (let turn = 0; turn < 8 && !battle.ended; turn++) {
        const actions: Record<string, RoundAction> = {}
        for (const combatant of battle.combatants()) {
          const request = battle.request(combatant.id)
          if (!request.canAct || request.forced) continue
          const usable = request.moves.filter((option) => !option.disabled && (!option.needsTarget || option.targets.length > 0))
          const option = usable[(seed + turn + combatant.position) % Math.max(1, usable.length)]
          if (option) actions[combatant.id] = option.needsTarget ? move(option.id, option.targets[(seed + turn) % option.targets.length]) : move(option.id)
          else actions[combatant.id] = { type: 'wait' }
        }
        const before = battle.combatants()
        const result = battle.resolveRound({ actions })
        const script = roundScript(told(battle, result))
        for (const kind of script.unknown) unknown.add(kind)
        // Whatever was said or not, the steps leave everyone's HP where the fight has it.
        const shown = standingAfter(before, script.steps, script.steps.length)
        expect(shown.map((combatant) => combatant.hp)).toEqual(battle.combatants().map((combatant) => combatant.hp))
      }
    }
    expect([...unknown]).toEqual([])
  })
})

describe('what a step says, in words', () => {
  const texts: Record<string, string> = { moveUsed: '{pokemon0} uses {move}!', rise: 'La force {de}{pokemon0} monte !', swap: '{pokemon0} et {pokemon1}' }
  const telling: Telling = {
    official: (key) => texts[key],
    own: { downed: (name) => `${name} is down!`, bagUsed: (user, target, item) => `${user} used the ${item} on ${target}.` },
    nameOf: (id) => ({ a: 'Abra', p: 'Pikachu', h: 'Hypno' })[id] ?? id,
    moveName: (id) => id.toUpperCase(),
    itemName: (id) => `[${id}]`,
  }
  const say = (said: Said) => sentence(said, telling)

  it('fills the gaps of the games\' sentence with names', () => {
    expect(say({ key: 'moveUsed', pokemon: ['p'], move: 'tackle' })).toBe('Pikachu uses TACKLE!')
    expect(say({ key: 'swap', pokemon: ['p', 'a'] })).toBe('Pikachu et Abra')
  })

  it('writes the French "de" as the games do: elided before a vowel or an h', () => {
    expect(say({ key: 'rise', pokemon: ['p'] })).toBe('La force de Pikachu monte !')
    expect(say({ key: 'rise', pokemon: ['a'] })).toBe('La force d’Abra monte !')
    expect(say({ key: 'rise', pokemon: ['h'] })).toBe('La force d’Hypno monte !')
  })

  it('says Denborn\'s own events with Denborn\'s own words', () => {
    expect(say({ key: 'own.downed', pokemon: ['p'] })).toBe('Pikachu is down!')
    expect(say({ key: 'own.bagUsed', pokemon: ['p', 'a'], item: 'potion' })).toBe('Pikachu used the [potion] on Abra.')
  })

  it('says nothing when it has no sentence', () => {
    expect(say({ key: 'never-heard' })).toBeUndefined()
    expect(say({ key: 'own.never-heard' })).toBeUndefined()
  })
})
