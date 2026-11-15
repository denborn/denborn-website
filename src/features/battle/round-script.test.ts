import { describe, expect, it } from 'vitest'
import type { CombatantSetup, DenbornBattle, RoundAction } from '../../battle/denborn-battle'
import { bag, enemy, move, player, round, seedNumber, start } from '../../battle/test-kit'
import type { BagEffect } from '../../game-rules/bag-effects'
import { type Said, type Telling, abilityShownAt, roundScript, sentence, standingAfter } from './round-script'

/** A round's log as it leaves the table: each Pokémon named by its id. */
const told = (battle: DenbornBattle, result: ReturnType<typeof round>) => ({
  log: result.log.map((line) => line.replace(/p[12][a-f]?: [PE][1-6]/g, (identity) => battle.whoIs(identity) ?? identity)),
  events: result.events,
})
/** The games' sentences a test supposes: these messages have one, the others none. */
const having =
  (...keys: string[]) =>
  (key: string): string | undefined =>
    keys.includes(key) ? '' : undefined
/** Plays a round and gives its script, with how everyone stood before and stands after. Every message has its sentence, unless the test says which do. */
function play(battle: DenbornBattle, actions: Record<string, RoundAction> = {}, official?: Parameters<typeof roundScript>[1]) {
  const before = battle.combatants()
  const script = roundScript({ ...told(battle, round(battle, actions)), before }, official)
  const said = script.steps.flatMap((step) => (step.said ? [step.said] : []))
  return { before, script, after: battle.combatants(), said, keys: said.map((message) => message.key) }
}
/** The steps of lines written by hand, in the engine's form: for what a line's tags decide. */
const scriptOf = (log: string[], more: Partial<Parameters<typeof roundScript>[0]> = {}, official?: Parameters<typeof roundScript>[1]) =>
  roundScript({ log, events: [], ...more }, official)
const keysOf = (...args: Parameters<typeof scriptOf>): string[] => scriptOf(...args).steps.flatMap((step) => (step.said ? [step.said.key] : []))
const HEAL: BagEffect = { heal: 20 }

describe('a round as it is told', () => {
  it('says the move, shows who uses it and who it is aimed at, then the hit', () => {
    const battle = start([player('one', 'Machamp', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])])
    const { script, before } = play(battle, { one: move('tackle', 'foe') })
    const [used, hit] = script.steps
    expect(used).toMatchObject({ said: { key: 'move', pokemon: ['one'], move: 'tackle' }, show: ['one', 'foe'], motion: { attack: 'one' } })
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
    expect(first.keys).toEqual(expect.arrayContaining(['move', 'boost.atk.2', 'immune', 'cant.slp']))
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
    expect(first.keys).toEqual(expect.arrayContaining(['start.reflect.party', 'start.electricterrain', 'start.spikes.party']))
    const second = play(battle, { one: move('substitute'), two: move('solarbeam', 'foe'), foe: move('lightscreen') })
    expect(second.keys).toEqual(expect.arrayContaining(['start.substitute', 'prepare.solarbeam', 'start.lightscreen.foes']))
  })

  it('counts the hits of a move that hits several times', () => {
    const battle = start([player('one', 'Machamp', ['doublekick'])], [enemy('foe', 'Snorlax', ['tackle'])])
    const { script } = play(battle, { one: move('doublekick', 'foe') })
    const hits = script.steps.filter((step) => step.motion?.hit === 'foe').length
    expect(hits).toBeGreaterThan(1)
    expect(script.steps.find((step) => step.said?.key === 'hitCount')?.said?.number).toBe(hits)
  })

  it('shows an Ability that acts as its holder\'s, before what it did', () => {
    const battle = start([player('one', 'Machamp', ['earthquake'])], [enemy('foe', 'Weezing', ['tackle'], { ability: 'Levitate' })])
    const { said } = play(battle, { one: move('earthquake') }, having('ability', 'immune'))
    const shown = said.findIndex((message) => message.key === 'ability')
    expect(said[shown]).toMatchObject({ pokemon: ['foe'], ability: 'levitate' })
    expect(said[shown + 1]).toMatchObject({ key: 'immune', pokemon: ['foe'] })
  })

  it('says a move\'s own line with who it holds, who did it and which move it is about', () => {
    const battle = start([player('one', 'Arbok', ['wrap', 'disable'])], [enemy('foe', 'Snorlax', ['tackle'])], { seed: seedNumber(3) })
    const first = play(battle, { one: move('wrap', 'foe'), foe: move('tackle', 'one') }, having('start.wrap', 'damageFromPartialTrapping'))
    expect(first.said.find((message) => message.key === 'start.wrap')).toMatchObject({ pokemon: ['foe'], source: 'one' })
    // What a binding move does each turn is said of the move.
    expect(first.said.find((message) => message.key === 'damageFromPartialTrapping')).toMatchObject({ pokemon: ['foe'], move: 'wrap' })
    const second = play(battle, { one: move('disable', 'foe'), foe: move('tackle', 'one') })
    expect(second.said.find((message) => message.key === 'start.disable')).toMatchObject({ pokemon: ['foe'], move: 'tackle' })
  })

  it('says what a held item does with the item, and whose it is when it hurts another', () => {
    const battle = start(
      [player('one', 'Machamp', ['tackle'], { item: 'leftovers', hp: 60 }), player('two', 'Jolteon', ['thunderwave'])],
      [enemy('foe', 'Snorlax', ['tackle'], { item: 'cheriberry' }), enemy('mob', 'Golem', ['tackle'], { item: 'rockyhelmet' })],
    )
    const { said } = play(battle, { one: move('tackle', 'mob'), two: move('thunderwave', 'foe') }, having('heal.leftovers', 'endFromItem.par', 'end.par', 'damage.rockyhelmet'))
    expect(said.find((message) => message.key.startsWith('heal.'))).toMatchObject({ key: 'heal.leftovers', pokemon: ['one'], item: 'leftovers' })
    // The Berry eaten on the line before is the one that cured.
    expect(said.find((message) => message.key.startsWith('endFromItem.'))).toMatchObject({ key: 'endFromItem.par', pokemon: ['foe'], item: 'cheriberry' })
    expect(said.find((message) => message.key.startsWith('damage.'))).toMatchObject({ key: 'damage.rockyhelmet', pokemon: ['one'], source: 'mob' })
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

describe('which message a line gets', () => {
  it('is the first one the games have a sentence for, from the effect\'s own to the one said of any', () => {
    const line = ['|-heal|a|50/100|[from] item: Leftovers']
    expect(keysOf(line, {}, having('heal.leftovers', 'healFromItem', 'heal'))).toEqual(['heal.leftovers'])
    expect(scriptOf(line, {}, having('healFromItem')).steps[0]?.said).toEqual({ key: 'healFromItem', pokemon: ['a'], source: undefined, item: 'leftovers' })
    expect(keysOf(line, {}, having('healFromItem', 'heal'))).toEqual(['healFromItem'])
    expect(keysOf(line, {}, having('heal'))).toEqual(['heal'])
    // With none, nothing is said, and the HP still changes; a move that is not announced is still played.
    expect(scriptOf(line, {}, having()).steps).toEqual([{ show: ['a'], change: { id: 'a', hp: 50 } }])
    expect(scriptOf(['|move|a|Tackle|b', '|-crit|b'], {}, having()).steps).toEqual([{ show: ['a', 'b'], motion: { attack: 'a' } }])
  })

  it('is passed over when its sentence names something the line does not have', () => {
    const sentences: Record<string, string> = { 'heal.wish': '{target} and {pokemon0}', heal: '{pokemon0}' }
    expect(keysOf(['|-heal|a|50/100|[from] move: Wish'], {}, (key) => sentences[key])).toEqual(['heal'])
  })

  it('is nothing for a line the engine marked silent, which still changes what it changes', () => {
    expect(scriptOf(['|-heal|a|50/100|[from] item: Leftovers|[silent]', '|-status|b|psn|[from] ability: Poison Point|[of] a|[silent]']).steps).toEqual([
      { show: ['a'], change: { id: 'a', hp: 50 } },
      { show: ['b'], change: { id: 'b', status: 'psn' } },
    ])
  })

  it('reads the engine\'s older lines as what they stand for', () => {
    expect(keysOf(['|-activate|a|move: Protect'])).toEqual(['block.protect'])
    expect(keysOf(['|-nothing'])).toEqual(['activate.splash'])
    expect(scriptOf(['|-activate|a|move: Wrap|[of] b']).steps[0]?.said).toMatchObject({ key: 'start.wrap', pokemon: ['a'], source: 'b' })
    expect(scriptOf(['|-fail|a|unboost|Attack|[from] ability: Hyper Cutter|[of] a'], {}, having('fail.unboost.atk', 'fail.unboost')).steps[0]?.said).toMatchObject({ key: 'fail.unboost.atk', pokemon: ['a'] })
    // An Ability that stops a move: the Ability is its holder's, the sentence names who could not move.
    expect(scriptOf(['|cant|a|ability: Damp|Explosion|[of] b']).steps.map((step) => step.said)).toMatchObject([
      { key: 'ability', pokemon: ['a'], ability: 'damp' },
      { key: 'block.damp', source: 'b', move: 'explosion' },
    ])
  })

  /** What lines written by hand say, in order. */
  const saidOf = (...args: Parameters<typeof scriptOf>) => scriptOf(...args).steps.flatMap((step) => (step.said ? [step.said] : []))

  it('names what a line is about by its tags: tired, each turn, from an item, how many, which type', () => {
    expect(keysOf(['|-start|a|confusion|[fatigue]', '|-start|a|Uproar|[upkeep]', '|-start|a|Substitute|[already]'])).toEqual(['startFromFatigue.confusion', 'upkeep.uproar', 'alreadyStarted.substitute'])
    expect(saidOf(['|-start|a|Attract|[from] item: Destiny Knot'], {}, having('startFromItem.attract', 'start.attract'))).toMatchObject([{ key: 'startFromItem.attract', item: 'destinyknot' }])
    expect(saidOf(['|-start|a|perish3', '|-start|a|stockpile2'])).toMatchObject([{ key: 'activate.perishsong', number: 3 }, { key: 'start.stockpile', number: 2 }])
    expect(saidOf(['|-start|a|typechange|Water|[from] move: Soak'])).toMatchObject([{ key: 'typeChange.soak', pokemon: ['a'], type: 'water' }])
    // Two types at once are not one the sentence can name.
    expect(keysOf(['|-start|a|typechange|Water/Ground'], {}, (key) => (key === 'typeChange' ? '{pokemon0} {type}' : undefined))).toEqual([])
    expect(saidOf(['|-status|a|brn|[from] item: Flame Orb', '|-status|b|slp|[from] move: Rest'])).toMatchObject([{ key: 'startFromItem.brn', item: 'flameorb' }, { key: 'startFromRest.slp', pokemon: ['b'] }])
    expect(saidOf(['|-curestatus|a|frz|[from] move: Flame Wheel|[thaw]'])).toMatchObject([{ key: 'endFromMove.frz', move: 'flamewheel' }])
    expect(saidOf(['|move|a|Thunder|b|[from] move: Metronome'])).toMatchObject([{ key: 'move.metronome', pokemon: ['a'], move: 'thunder' }])
  })

  it('shows the Ability behind a line as its holder\'s: the line\'s Pokémon, or the one the line came from', () => {
    const sentences = having('ability', 'start.disable', 'changeAbility.trace', 'start.gastroacid', 'activate.frisk', 'activate.skillswap', 'heal', 'fail.unboost')
    expect(saidOf(['|-start|a|Disable|Tackle|[from] ability: Cursed Body|[of] b'], {}, sentences)).toMatchObject([
      { key: 'ability', pokemon: ['b'], ability: 'cursedbody' },
      { key: 'start.disable', pokemon: ['a'], move: 'tackle' },
    ])
    expect(saidOf(['|-ability|a|Static|[from] ability: Trace|[of] b'], {}, sentences)).toMatchObject([
      { key: 'ability', pokemon: ['a'], ability: 'trace' },
      { key: 'ability', pokemon: ['a'], ability: 'static' },
      { key: 'changeAbility.trace', ability: 'static', source: 'b' },
    ])
    expect(saidOf(['|-ability|a|Intimidate|boost', '|-endability|b'], {}, sentences)).toMatchObject([{ key: 'ability', pokemon: ['a'], ability: 'intimidate' }, { key: 'start.gastroacid', pokemon: ['b'] }])
    expect(saidOf(['|-item|a|Leftovers|[from] ability: Frisk|[of] b'], {}, sentences)).toMatchObject([
      { key: 'ability', pokemon: ['b'], ability: 'frisk' },
      { key: 'activate.frisk', pokemon: ['b'], target: 'a', item: 'leftovers' },
    ])
    // Two Pokémon that traded Abilities each show the one they now have.
    expect(saidOf(['|-activate|a|move: Skill Swap|Static|Levitate|[of] b'], {}, sentences)).toMatchObject([
      { key: 'ability', pokemon: ['a'], ability: 'static' },
      { key: 'ability', pokemon: ['b'], ability: 'levitate' },
      { key: 'activate.skillswap', pokemon: ['a'], target: 'b' },
    ])
    // An Ability that drinks an attack is its holder's, not the attacker's.
    expect(saidOf(['|-heal|a|50/100|[from] ability: Water Absorb|[of] b'], {}, sentences)).toMatchObject([{ key: 'ability', pokemon: ['a'], ability: 'waterabsorb' }, { key: 'heal' }])
    expect(saidOf(['|-fail|a|unboost|[from] ability: Clear Body|[of] a'], {}, sentences)).toMatchObject([{ key: 'ability', ability: 'clearbody' }, { key: 'fail.unboost', pokemon: ['a'] }])
  })

  it('says what ends: by the Berry just eaten, of the move that held, of the attack that lands', () => {
    const sentences = having('end', 'end.confusion', 'endFromItem.confusion', 'activate.futuresight')
    expect(saidOf(['|-enditem|a|Persim Berry|[eat]', '|-end|a|confusion'], {}, sentences)).toMatchObject([{ key: 'endFromItem.confusion', pokemon: ['a'], item: 'persimberry' }])
    // Another Pokémon's Berry, or a Berry eaten earlier, cured nothing here.
    expect(keysOf(['|-enditem|a|Persim Berry|[eat]', '|-end|b|confusion'], {}, sentences)).toEqual(['end.confusion'])
    expect(keysOf(['|-enditem|a|Persim Berry|[eat]', '|-crit|a', '|-end|a|confusion'], {}, having('end.confusion', 'endFromItem.confusion'))).toEqual(['end.confusion'])
    expect(saidOf(['|-end|a|Fire Spin|[partiallytrapped]'], {}, sentences)).toMatchObject([{ key: 'end', pokemon: ['a'], move: 'firespin' }])
    // "Freed from" is said of a move that held a Pokémon, not of whatever ends.
    expect(keysOf(['|-end|a|Slow Start'], {}, sentences)).toEqual([])
    expect(saidOf(['|-end|a|move: Future Sight'], {}, sentences)).toMatchObject([{ key: 'activate.futuresight', target: 'a', move: 'futuresight' }])
  })

  it('says what becomes of an item: taken, eaten by another, knocked off, used up', () => {
    expect(saidOf(['|-item|a|Leftovers|[from] move: Thief|[of] b'])).toMatchObject([{ key: 'takeItem.thief', pokemon: ['a'], item: 'leftovers', source: 'b' }])
    expect(saidOf(['|-enditem|a|Oran Berry|[from] stealeat|[move] Bug Bite|[of] b'])).toMatchObject([{ key: 'removeItem.bugbite', source: 'b', item: 'oranberry' }])
    expect(saidOf(['|-enditem|a|Leftovers|[from] move: Knock Off|[of] b'])).toMatchObject([{ key: 'removeItem.knockoff', pokemon: ['a'], source: 'b' }])
    expect(saidOf(['|-enditem|a|Normal Gem|[from] gem|[move] Tackle'], {}, having('useGem'))).toMatchObject([{ key: 'useGem', item: 'normalgem', move: 'tackle' }])
    expect(saidOf(['|-enditem|a|Occa Berry|[weaken]', '|-enditem|a|Focus Sash'])).toMatchObject([{ key: 'activateWeaken', item: 'occaberry' }, { key: 'end.focussash', item: 'focussash' }])
    expect(saidOf(['|-activate|a|item: Leppa Berry|Tackle'])).toMatchObject([{ key: 'activate.leppaberry', pokemon: ['a'], item: 'leppaberry', move: 'tackle' }])
  })

  it('says whose item hurt: the Pokémon\'s own, or another\'s', () => {
    const sentences = having('damageFromItem', 'damageFromPokemon')
    expect(saidOf(['|-damage|a|10/100|[from] item: Rocky Helmet|[of] b'], {}, sentences)).toMatchObject([{ key: 'damageFromPokemon', pokemon: ['a'], item: 'rockyhelmet', source: 'b' }])
    expect(saidOf(['|-damage|a|10/100|[from] item: Sticky Barb'], {}, sentences)).toMatchObject([{ key: 'damageFromItem', pokemon: ['a'], item: 'stickybarb' }])
    // A hit is shown by the sprite; damage from something else is not.
    expect(scriptOf(['|-damage|a|10/100', '|-damage|a|5/100|[from] psn'], {}, sentences).steps).toEqual([
      { show: ['a'], change: { id: 'a', hp: 10 }, motion: { hit: 'a' } },
      { show: ['a'], change: { id: 'a', hp: 5 } },
    ])
  })

  it('says a stat change by how far it goes, and by the item that made it', () => {
    const sentences = having('boostFromItem.def.1', 'boost.def.1', 'boost.def.-1', 'boost.atk.3', 'boost.atk.max', 'boost.atk.min')
    expect(saidOf(['|-boost|a|def|1|[from] item: Ganlon Berry'], {}, sentences)).toMatchObject([{ key: 'boostFromItem.def.1', pokemon: ['a'], item: 'ganlonberry' }])
    expect(keysOf(['|-boost|a|def|1', '|-unboost|a|def|1|[from] item: Ganlon Berry', '|-boost|a|atk|6', '|-boost|a|atk|0', '|-unboost|a|atk|0'], {}, sentences)).toEqual(['boost.def.1', 'boost.def.-1', 'boost.atk.3', 'boost.atk.max', 'boost.atk.min'])
    const swaps = having('swapDefensiveBoost', 'swapOffensiveBoost', 'swapBoost')
    expect(keysOf(['|-swapboost|a|b|def, spd|[from] move: Guard Swap', '|-swapboost|a|b|atk, spa|[from] move: Power Swap', '|-swapboost|a|b|[from] move: Heart Swap'], {}, swaps)).toEqual(['swapDefensiveBoost', 'swapOffensiveBoost', 'swapBoost'])
    expect(saidOf(['|-setboost|a|atk|6|[from] move: Belly Drum', '|-copyboost|a|b|[from] move: Psych Up'])).toMatchObject([{ key: 'boost.bellydrum', pokemon: ['a'] }, { key: 'copyBoost.psychup', target: 'b' }])
  })

  it('says on whom a hit told, when the move was aimed at several', () => {
    expect(keysOf(['|move|a|Surf|b|[spread] p2a,p2b', '|-crit|b', '|-supereffective|c', '|-resisted|b', '|move|a|Tackle|b', '|-crit|b', '|-supereffective|b', '|-resisted|b'])).toEqual([
      'move', 'critSpread', 'superEffectiveSpread', 'resistedSpread', 'move', 'crit', 'superEffective', 'resisted',
    ])
  })

  it('says why a move failed, when the games say it', () => {
    const sentences = having('fail', 'alreadyStarted.slp', 'alreadyStarted.substitute', 'fail.substitute', 'blockSelf.uproar', 'block.uproar', 'immune', 'immuneOHKO', 'miss')
    expect(keysOf(['|-fail|a', '|-fail|a|slp', '|-fail|a|move: Substitute', '|-fail|a|move: Substitute|[weak]', '|-fail|a|move: Aura Wheel'], {}, sentences)).toEqual(['fail', 'alreadyStarted.slp', 'alreadyStarted.substitute', 'fail.substitute', 'fail'])
    expect(keysOf(['|-fail|a|slp|[from] Uproar|[msg]', '|-fail|a|slp|[from] Uproar'], {}, sentences)).toEqual(['blockSelf.uproar', 'block.uproar'])
    expect(keysOf(['|-immune|a', '|-immune|a|[ohko]'], {}, sentences)).toEqual(['immune', 'immuneOHKO'])
    // The one who was aimed at avoided it; a move that simply missed has no sentence.
    expect(saidOf(['|-miss|a|b', '|-miss|a'], {}, sentences)).toEqual([{ key: 'miss', pokemon: ['b'] }])
    // What the engine wrote as "activated" and marked as a block is a failure.
    expect(keysOf(['|-activate|a|move: Mist|[block]'], {}, having('fail', 'block.mist'))).toEqual(['fail'])
  })

  it('names who did what to whom where a move\'s line turns them around', () => {
    expect(saidOf(['|-activate|a|move: Lock-On|[of] b'])).toMatchObject([{ key: 'start.lockon', pokemon: ['b'], source: 'a' }])
    // A line that names nobody else is aimed at its own Pokémon: the one whose protection broke.
    expect(saidOf(['|-activate|a|move: Attract|[of] b', '|-activate|a|move: Feint'])).toMatchObject([{ key: 'activate.attract', pokemon: ['a'], target: 'b' }, { key: 'activate.feint', pokemon: ['a'], target: 'a' }])
    expect(saidOf(['|-singleturn|a|move: Instruct|[of] b'])).toMatchObject([{ key: 'activate.instruct', pokemon: ['b'], target: 'a' }])
    expect(saidOf(['|-prepare|a|Sky Drop|b', '|-transform|a|b'])).toMatchObject([{ key: 'prepare.skydrop', pokemon: ['a'], target: 'b' }, { key: 'transform.transform', pokemon: ['a'], target: 'b' }])
    expect(saidOf(['|-activate|a|ability: Aroma Veil|[of] b'], {}, having('ability', 'block.aromaveil'))).toMatchObject([{ key: 'ability', pokemon: ['a'] }, { key: 'block.aromaveil', pokemon: ['b'] }])
    expect(keysOf(['|-activate|a|move: Magnitude|7'])).toEqual(['activate.magnitude.7'])
    // A line that already says what it is about in its tags is aimed at the one it came from.
    expect(saidOf(['|-activate|a|move: Grudge|[of] b|[move] Tackle'])).toMatchObject([{ key: 'activate.grudge', pokemon: ['a'], target: 'b', move: 'tackle' }])
  })

  it('says what holds over the field by who brought it, and shows nobody for what names no Pokémon', () => {
    expect(scriptOf(['|-fieldstart|move: Trick Room|[of] a', '|-fieldend|move: Trick Room', '|-sidestart|p2: enemies|move: Reflect']).steps).toMatchObject([
      { said: { key: 'start.trickroom', pokemon: ['a'] }, show: ['a'] },
      { said: { key: 'end.trickroom' }, show: [] },
      { said: { key: 'start.reflect.foes' }, show: [] },
    ])
    expect(keysOf(['|-fieldactivate|move: Perish Song', '|-fieldactivate|move: Ion Deluge'])).toEqual(['start.perishsong', 'activate.iondeluge'])
  })

  it('shows an Ability once for the lines it wrote in a row', () => {
    const boost = (stat: string) => `|-boost|a|${stat}|1|[from] ability: Download|[of] a`
    expect(keysOf([boost('atk'), boost('spa')])).toEqual(['ability', 'boost.atk.1', 'boost.spa.1'])
    expect(keysOf([boost('atk'), '|-crit|b', boost('spa')])).toEqual(['ability', 'boost.atk.1', 'crit', 'ability', 'boost.spa.1'])
    // Another Pokémon's Ability of the same name is another Ability.
    expect(keysOf([boost('atk'), boost('spa').replace('[of] a', '[of] b')])).toEqual(['ability', 'boost.atk.1', 'ability', 'boost.spa.1'])
  })

  it('names the weather that ends: the one the round began under, or the one that began in it', () => {
    expect(keysOf(['|-weather|none'], { weather: 'raindance' })).toEqual(['end.raindance'])
    expect(keysOf(['|-weather|Sandstorm', '|-weather|Sandstorm|[upkeep]', '|-weather|none'])).toEqual(['start.sandstorm', 'end.sandstorm'])
    expect(keysOf(['|-weather|RainDance', '|-weather|none', '|-weather|none'])).toEqual(['start.raindance', 'end.raindance'])
    expect(keysOf(['|-weather|none'])).toEqual([])
  })

  it('says what is laid on a team for the player\'s own team or for the other, by whose Pokémon it is', () => {
    const before = [{ id: 'a', side: 'players' }, { id: 'z', side: 'enemies' }] as NonNullable<Parameters<typeof roundScript>[0]['before']>
    const teams = having('start.wideguard.party', 'start.wideguard.foes', 'start.unnerve.party', 'start.unnerve.foes')
    expect(keysOf(['|-singleturn|a|Wide Guard', '|-singleturn|z|Wide Guard'], { before }, teams)).toEqual(['start.wideguard.party', 'start.wideguard.foes'])
    // Unnerve is said of the team that faces it.
    expect(keysOf(['|-ability|z|Unnerve'], { before }, teams)).toEqual(['start.unnerve.party'])
  })
})

describe('the Ability named on the scene', () => {
  it('is the one a step shows, stays while what it did is said, and is gone when a move is announced', () => {
    const { steps } = scriptOf(['|-ability|a|Intimidate|boost', '|-unboost|b|atk|1', '|-unboost|c|atk|1', '|-activate|a|ability: Synchronize', '|move|b|Tackle|a'], {}, having('ability', 'boost.atk.-1', 'move'))
    const shown = steps.map((_, at) => abilityShownAt(steps, at)?.ability)
    expect(steps.map((step) => step.said?.key)).toEqual(['ability', 'boost.atk.-1', 'boost.atk.-1', 'ability', 'move'])
    expect(shown).toEqual(['intimidate', 'intimidate', undefined, 'synchronize', undefined])
  })
})

describe('what a step says, in words', () => {
  const texts: Record<string, string> = {
    move: '{pokemon0} uses {move}!',
    rise: 'La force {de}{pokemon0} monte !',
    swap: '{pokemon0} et {pokemon1}',
    held: '{source} holds {target} with {ability}, {type} type.',
    hits: 'Hit {number} time{number:|s}!',
    heals: '{Le}{item} {de}{pokemon0} restaure{item:||nt|nt} ses PV grâce {au}{item}, {le}{item}, {un}{item}, {du}{item}.',
  }
  const grammar: Record<string, string> = { baie: 'f', casque: 'm', orbe: 'm', restes: 'mp', lunettes: 'fp' }
  const telling: Telling = {
    official: (key) => texts[key],
    own: { downed: (name) => `${name} is down!`, bagUsed: (user, target, item) => `${user} used the ${item} on ${target}.` },
    nameOf: (id) => ({ a: 'Abra', p: 'Pikachu', h: 'Hypno' })[id] ?? id,
    moveName: (id) => id.toUpperCase(),
    itemName: (id) => (id in grammar ? id.charAt(0).toUpperCase() + id.slice(1) : `[${id}]`),
    abilityName: (id) => `(${id})`,
    typeName: (id) => id.toUpperCase(),
    itemGrammar: (id) => grammar[id],
  }
  const say = (said: Said) => sentence(said, telling)

  it('fills the gaps of the games\' sentence with names', () => {
    expect(say({ key: 'move', pokemon: ['p'], move: 'tackle' })).toBe('Pikachu uses TACKLE!')
    expect(say({ key: 'swap', pokemon: ['p', 'a'] })).toBe('Pikachu et Abra')
    expect(say({ key: 'held', source: 'p', target: 'a', ability: 'static', type: 'fire' })).toBe('Pikachu holds Abra with (static), FIRE type.')
  })

  it('writes the form that goes with a number: one, or several', () => {
    expect(say({ key: 'hits', number: 1 })).toBe('Hit 1 time!')
    expect(say({ key: 'hits', number: 3 })).toBe('Hit 3 times!')
  })

  it('writes the French articles and agreements of an item by its gender, its number and its first letter', () => {
    const heals = (item: string) => say({ key: 'heals', pokemon: ['p'], item })
    expect(heals('baie')).toBe('La Baie de Pikachu restaure ses PV grâce à la Baie, la Baie, une Baie, de la Baie.')
    expect(heals('casque')).toBe('Le Casque de Pikachu restaure ses PV grâce au Casque, le Casque, un Casque, du Casque.')
    expect(heals('orbe')).toBe('L’Orbe de Pikachu restaure ses PV grâce à l’Orbe, l’Orbe, un Orbe, de l’Orbe.')
    expect(heals('restes')).toBe('Les Restes de Pikachu restaurent ses PV grâce aux Restes, les Restes, des Restes, des Restes.')
    expect(heals('lunettes')).toBe('Les Lunettes de Pikachu restaurent ses PV grâce aux Lunettes, les Lunettes, des Lunettes, des Lunettes.')
    // An item whose grammar is not known cannot be given its article: the sentence is not said.
    expect(heals('potion')).toBeUndefined()
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

  it('says nothing when it has no sentence, or when the sentence names what the step does not have', () => {
    expect(say({ key: 'never-heard' })).toBeUndefined()
    expect(say({ key: 'own.never-heard' })).toBeUndefined()
    expect(say({ key: 'move', pokemon: ['p'] })).toBeUndefined()
    expect(say({ key: 'held', source: 'p', target: 'a', ability: 'static' })).toBeUndefined()
  })
})
