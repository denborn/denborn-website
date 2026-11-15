import { Dex } from '@pkmn/sim'
import { describe, expect, it } from 'vitest'
import { BattleRuleError, type DenbornBattle } from './denborn-battle'
import { enemy, extra, move, player, round, seedNumber, start, struggle, timeline } from './test-kit'

function pp(battle: DenbornBattle, id: string, moveId: string): number {
  const slot = battle.combatant(id).moves.find((candidate) => candidate.id === moveId)
  if (!slot) throw new Error(`${id} does not know ${moveId}`)
  return slot.pp
}

function code(action: () => unknown): string {
  try {
    action()
  } catch (error) {
    if (error instanceof BattleRuleError) return error.code
    throw error
  }
  return 'accepted'
}

describe('extra enemy moves', () => {
  const boss = () => enemy('boss', 'Snorlax', ['tackle', 'swift', 'outrage', 'hyperbeam'])
  const heroes = () => [player('one', 'Chansey', ['tackle']), player('two', 'Chansey', ['tackle'])]

  it('lets an enemy use several moves in a round, each spending PP, in the order they were entered', () => {
    for (let n = 1; n <= 30; n++) {
      const battle = start(heroes(), [boss()], { seed: seedNumber(n) })
      const before = { tackle: pp(battle, 'boss', 'tackle'), swift: pp(battle, 'boss', 'swift') }

      const result = round(battle, { boss: move('tackle', 'one') }, { boss: [extra('swift'), extra('tackle', 'two')] })

      expect(timeline(battle, result).filter((step) => step.startsWith('move boss'))).toEqual([
        'move boss tackle one',
        // A spread move's line names one of its targets; which one is the engine's pick.
        expect.stringMatching(/^move boss swift (one|two)$/),
        'move boss tackle two',
      ])
      expect(pp(battle, 'boss', 'tackle')).toBe(before.tackle - 2)
      expect(pp(battle, 'boss', 'swift')).toBe(before.swift - 1)
    }
  })

  it('still places each move by its own priority', () => {
    const battle = start(heroes(), [enemy('boss', 'Snorlax', ['tackle', 'quickattack'])])
    const result = round(battle, { boss: move('tackle', 'one') }, { boss: [extra('quickattack', 'two')] })
    expect(timeline(battle, result).filter((step) => step.startsWith('move boss'))).toEqual([
      'move boss quickattack two',
      'move boss tackle one',
    ])
  })

  it('is refused for a player, and for a move the enemy cannot use', () => {
    const battle = start(heroes(), [boss()])
    expect(code(() => round(battle, {}, { one: [extra('tackle', 'boss')] }))).toBe('extra-moves')
    expect(code(() => round(battle, {}, { boss: [extra('surf')] }))).toBe('unknown-move')
    expect(battle.round).toBe(1)
  })

  it('treats each action as a turn of its own for a recharge and for a two-turn move', () => {
    const acts = (battle: DenbornBattle, result: ReturnType<typeof round>) =>
      timeline(battle, result)
        .filter((step) => step.includes(' boss '))
        .map((step) => step.split(' ').slice(0, 3).join(' '))

    // Hyper Beam, then an extra move: the extra move is spent recharging, and the next round is free.
    const beam = start(heroes(), [boss()])
    expect(acts(beam, round(beam, { boss: move('hyperbeam', 'one') }, { boss: [extra('tackle', 'two')] }))).toEqual([
      'move boss hyperbeam',
      'cant boss recharge',
    ])
    expect(beam.request('boss').forced).toBeNull()

    // A recharge owed from the round before costs the first action only.
    const owed = start(heroes(), [boss()])
    round(owed, { boss: move('hyperbeam', 'one') })
    expect(acts(owed, round(owed, {}, { boss: [extra('tackle', 'two')] }))).toEqual(['cant boss recharge', 'move boss tackle'])

    // A two-turn move charges on one action and is released on the next, with no lock left over.
    const solar = start(heroes(), [enemy('boss', 'Snorlax', ['tackle', 'solarbeam'])])
    const result = round(solar, { boss: move('solarbeam', 'one') }, { boss: [extra('tackle', 'two')] })
    expect(acts(solar, result)).toEqual(['move boss solarbeam', 'move boss solarbeam'])
    expect(solar.combatant('one').hp).toBeLessThan(solar.combatant('one').maxHp)
    expect(solar.request('boss').forced).toBeNull()
  })

  it('keeps a move lock that starts between two actions of the same round', () => {
    const battle = start(heroes(), [boss()])
    const before = pp(battle, 'boss', 'tackle')

    // Outrage locks its user in; the extra Tackle becomes a second Outrage, as the lock demands.
    const result = round(battle, { boss: move('outrage') }, { boss: [extra('tackle', 'one')] })
    expect(timeline(battle, result).filter((step) => step.startsWith('move boss')).map((step) => step.split(' ')[2])).toEqual([
      'outrage',
      'outrage',
    ])
    expect(pp(battle, 'boss', 'tackle')).toBe(before)
  })
})

describe('forced Struggle', () => {
  it('makes the Pokémon use Struggle on a foe in reach', () => {
    const battle = start([player('one', 'Chansey', ['tackle'])], [enemy('foe', 'Snorlax', ['tackle'])])
    const result = round(battle, { one: struggle })
    expect(timeline(battle, result)).toContain('move one struggle foe')
    expect(pp(battle, 'one', 'tackle')).toBe(battle.combatant('one').moves[0]?.maxPp)
  })
})

describe('the engine\'s own restrictions are kept', () => {
  it('leaves no choice to a Pokémon locked into a move, and carries the move on', () => {
    const battle = start([player('one', 'Chansey', ['tackle'])], [enemy('foe', 'Snorlax', ['outrage', 'tackle'])])
    round(battle, { foe: move('outrage') })

    expect(battle.request('foe').forced).toBe('outrage')
    expect(code(() => round(battle, { foe: move('tackle', 'one') }))).toBe('locked')
    expect(code(() => round(battle, { foe: struggle }))).toBe('locked')

    const result = round(battle)
    expect(timeline(battle, result)).toContain('move foe outrage one')
  })

  it('makes a recharging Pokémon recharge', () => {
    const battle = start([player('one', 'Chansey', ['tackle'])], [enemy('foe', 'Snorlax', ['hyperbeam'])])
    round(battle, { foe: move('hyperbeam', 'one') })

    expect(battle.request('foe').forced).toBe('recharge')
    expect(timeline(battle, round(battle))).toContain('cant foe recharge')
    expect(battle.request('foe').forced).toBeNull()
  })

  it('refuses a disabled move', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle'])],
      [enemy('foe', 'Jolteon', ['disable'])],
    )
    // Disable needs the target to have moved: the foe is faster, so it lands in the second round.
    round(battle, { one: move('tackle', 'foe') })
    round(battle, { one: move('tackle', 'foe'), foe: move('disable', 'one') })

    expect(battle.request('one').moves.find((option) => option.id === 'tackle')?.disabled).toBe(true)
    expect(code(() => round(battle, { one: move('tackle', 'foe') }))).toBe('move-disabled')
  })

  it('refuses a move without PP, and leaves only Struggle when no move has any', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle', 'pound'], { pp: { tackle: 0 } })],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    expect(code(() => round(battle, { one: move('tackle', 'foe') }))).toBe('move-disabled')

    const empty = start(
      [player('one', 'Chansey', ['tackle'], { pp: { tackle: 0, splash: 0 } })],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    expect(empty.request('one').moves.map((option) => option.id)).toEqual(['struggle'])
    expect(timeline(empty, round(empty, { one: move('struggle') }))).toContain('move one struggle foe')
  })

  it('refuses a round with a missing, unknown or badly aimed action, and plays nothing', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle', 'swift']), player('two', 'Chansey', ['tackle'])],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    const all = { two: move('splash'), foe: move('splash') }

    expect(code(() => battle.resolveRound({ actions: all }))).toBe('no-action')
    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('surf') } }))).toBe('unknown-move')
    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('tackle') } }))).toBe('target-required')
    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('swift', 'foe') } }))).toBe('no-target')
    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('tackle', 'one') } }))).toBe('bad-target')
    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('tackle', 'nobody') } }))).toBe('bad-target')
    expect(battle.round).toBe(1)

    expect(code(() => battle.resolveRound({ actions: { ...all, one: move('tackle', 'foe') } }))).toBe('accepted')
    expect(battle.round).toBe(2)
  })
})

describe('the item a Pokémon came in with (decision 136)', () => {
  it('is gone once eaten or used up, and not when it was knocked off', () => {
    // An Oran Berry is eaten once its holder is at half its HP or under; Knock Off takes the Leftovers away.
    const battle = start(
      [player('eater', 'Snorlax', ['tackle'], { item: 'oranberry', hp: 125 }), player('holder', 'Chansey', ['tackle'], { item: 'leftovers' }), player('bare', 'Machamp', ['tackle'])],
      [enemy('foe', 'Machamp', ['knockoff', 'tackle'])],
    )
    expect(battle.combatants().map((combatant) => combatant.itemSpent)).toEqual([false, false, false, false])
    round(battle, { foe: move('knockoff', 'holder') }, { foe: [extra('tackle', 'eater'), extra('tackle', 'eater')] })
    expect(battle.combatant('eater')).toMatchObject({ item: '', itemSpent: true })
    expect(battle.combatant('holder')).toMatchObject({ item: '', itemSpent: false })
    expect(battle.combatant('bare')).toMatchObject({ item: '', itemSpent: false })
  })
})

describe('an action checked before it is locked', () => {
  it('is refused for the reason the round itself would be refused, and nothing is played', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle']), player('two', 'Machamp', ['tackle'])],
      [enemy('foe', 'Snorlax', ['outrage', 'tackle'])],
    )
    expect(code(() => battle.checkAction('one', move('tackle', 'foe')))).toBe('accepted')
    expect(code(() => battle.checkAction('one', move('tackle')))).toBe('target-required')
    expect(code(() => battle.checkAction('one', move('surf')))).toBe('unknown-move')
    expect(code(() => battle.checkAction('one', move('tackle', 'foe'), [extra('tackle', 'foe')]))).toBe('extra-moves')
    expect(code(() => battle.checkAction('nobody', move('tackle', 'foe')))).toBe('unknown-combatant')

    round(battle, { foe: move('outrage') })
    expect(code(() => battle.checkAction('foe', move('tackle', 'one')))).toBe('locked')
    expect(battle.round).toBe(2)
  })
})

describe('a move with nobody in its reach', () => {
  it('cannot be locked; Struggle forced by a timeout is used and finds no target', () => {
    // Six players against a lone boss: from slot A, Tackle reaches only B, and B is dead.
    const battle = start(
      [
        player('A', 'Rattata', ['tackle', 'swift']),
        player('B', 'Rattata', ['tackle'], { hp: 1 }),
        ...['C', 'D', 'E', 'F'].map((id) => player(id, 'Rattata', ['tackle'])),
      ],
      [enemy('boss', 'Jolteon', ['aerialace'])],
    )
    round(battle, { boss: move('aerialace', 'B') })
    round(battle)
    round(battle)
    round(battle)
    expect(battle.combatant('B').dead).toBe(true)
    expect(battle.request('A').moves.find((option) => option.id === 'tackle')).toMatchObject({ needsTarget: true, targets: [] })

    expect(code(() => round(battle, { A: move('tackle') }))).toBe('nobody-in-reach')
    expect(code(() => round(battle, { A: move('tackle', 'B') }))).toBe('nobody-in-reach')
    expect(battle.round).toBe(5)

    // A move that takes no chosen target can still be used, and so can a forced Struggle.
    const before = pp(battle, 'A', 'tackle')
    const result = round(battle, { A: struggle })
    expect(result.log.some((entry) => entry.startsWith('|-fail|p1a: P1'))).toBe(true)
    expect(pp(battle, 'A', 'tackle')).toBe(before)
    expect(code(() => round(battle, { A: move('swift') }))).toBe('accepted')
  })
})

describe('what a Pokémon brings into the battle', () => {
  // The engine's own table is the reference for a move's base PP.
  const basePp = (id: string) => Dex.moves.get(id).pp

  it('starts each move at its base PP, raised by the PP Ups spent on it', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle', 'fireblast', 'swift'], { ppUps: { fireblast: 3, swift: 1 } })],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    const slots = Object.fromEntries(battle.combatant('one').moves.map((slot) => [slot.id, slot]))

    expect(slots.tackle).toMatchObject({ pp: basePp('tackle'), maxPp: basePp('tackle') })
    expect(slots.fireblast?.maxPp).toBe((basePp('fireblast') * 8) / 5)
    expect(slots.swift?.maxPp).toBe((basePp('swift') * 6) / 5)
  })

  it('carries HP, PP and status in, and spends one PP per move used', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle'], { hp: 42, status: 'psn', pp: { tackle: 7 } })],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    expect(battle.combatant('one')).toMatchObject({ hp: 42, status: 'psn' })
    expect(pp(battle, 'one', 'tackle')).toBe(7)

    round(battle, { one: move('tackle', 'foe') })
    expect(pp(battle, 'one', 'tackle')).toBe(6)
  })

  it('never lets carried values exceed the maximum', () => {
    const battle = start(
      [player('one', 'Chansey', ['tackle'], { hp: 99999, pp: { tackle: 999 } })],
      [enemy('foe', 'Snorlax', ['tackle'])],
    )
    const one = battle.combatant('one')
    expect(one.hp).toBe(one.maxHp)
    expect(pp(battle, 'one', 'tackle')).toBe(basePp('tackle'))
  })

  it('refuses a setup the fight cannot hold', () => {
    const hero = player('one', 'Chansey', ['tackle'])
    const foe = enemy('foe', 'Snorlax', ['tackle'])
    const seven = Array.from({ length: 7 }, (_, index) => player(`p${index}`, 'Rattata', ['tackle']))

    expect(code(() => start([], [foe]))).toBe('line-size')
    expect(code(() => start(seven, [foe]))).toBe('line-size')
    expect(code(() => start([hero, hero], [foe]))).toBe('duplicate-id')
    expect(code(() => start([player('a|b', 'Chansey', ['tackle'])], [foe]))).toBe('bad-id')
    expect(code(() => start([{ ...hero, species: 'Notapokemon' }], [foe]))).toBe('unknown-species')
    expect(code(() => start([player('one', 'Chansey', ['notamove'])], [foe]))).toBe('unknown-move')
    expect(code(() => start([{ ...hero, moves: [] }], [foe]))).toBe('move-count')
    expect(code(() => start([{ ...hero, level: 0 }], [foe]))).toBe('bad-level')
  })
})
