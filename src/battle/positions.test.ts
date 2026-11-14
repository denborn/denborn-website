import { describe, expect, it } from 'vitest'
import { BattleRuleError, type DenbornBattle, type RoundAction } from './denborn-battle'
import { damaged, enemy, eventsOf, move, player, round, start, timeline } from './test-kit'

function positions(battle: DenbornBattle, side: 'players' | 'enemies'): string {
  return battle
    .combatants()
    .filter((combatant) => combatant.side === side)
    .sort((a, b) => a.position - b.position)
    .map((combatant) => combatant.id)
    .join('')
}

function allySwitch(first: string, second: string): RoundAction {
  return { type: 'move', move: 'allyswitch', allySwitch: [first, second] }
}

describe('Run: taking another slot between rounds', () => {
  const four = () =>
    start(
      ['A', 'B', 'C', 'D'].map((id) => player(id, 'Rattata', ['tackle'])),
      [enemy('boss', 'Snorlax', ['tackle', 'swift'])],
    )

  it('trades places with the ally in that slot, and reach follows the new places', () => {
    const battle = four()
    const reach = () => battle.request('boss').moves.find((option) => option.id === 'tackle')?.targets.sort().join('')
    expect(reach()).toBe('BC')

    battle.run('A', 1)
    expect(positions(battle, 'players')).toBe('BACD')
    expect(reach()).toBe('AC')
  })

  it('lets a Pokémon take a dead ally\'s slot, but not a downed ally\'s', () => {
    const battle = start(
      [
        player('A', 'Rattata', ['tackle']),
        player('B', 'Rattata', ['tackle'], { hp: 1 }),
        player('C', 'Rattata', ['tackle']),
      ],
      [enemy('boss', 'Jolteon', ['tackle'])],
    )
    round(battle, { boss: move('tackle', 'B') })
    expect(() => battle.run('A', 1)).toThrow(BattleRuleError)

    // Three more rounds of Agony and B is dead; its slot stays and can be taken.
    round(battle)
    round(battle)
    round(battle)
    expect(battle.combatant('B').dead).toBe(true)

    battle.run('A', 1)
    expect(positions(battle, 'players')).toBe('BAC')
  })

  it('refuses a slot that does not exist', () => {
    expect(() => four().run('A', 4)).toThrow(BattleRuleError)
  })

  it('makes a two-turn move follow the Pokémon it was aimed at', () => {
    const battle = start(
      [player('flyer', 'Pidgeot', ['fly'])],
      [enemy('left', 'Machamp', ['tackle']), enemy('right', 'Machamp', ['tackle'])],
    )
    round(battle, { flyer: move('fly', 'left') })
    expect(battle.request('flyer').forced).toBe('fly')

    // The two enemies trade places while the flyer is in the air.
    battle.run('left', 1)
    const result = round(battle)

    expect(timeline(battle, result)).toContain('move flyer fly left')
    expect(damaged(battle)).toEqual(['left'])
  })

  it('makes that move fail when its target has left its reach', () => {
    // A reaches only the left-hand enemy slot. Solar Beam, unlike Fly, only reaches adjacent Pokémon.
    const battle = start(
      [player('A', 'Venusaur', ['solarbeam']), ...['B', 'C', 'D'].map((id) => player(id, 'Rattata', ['tackle']))],
      [enemy('left', 'Machamp', ['tackle']), enemy('right', 'Machamp', ['tackle'])],
    )
    round(battle, { A: move('solarbeam', 'left') })
    expect(battle.request('A').forced).toBe('solarbeam')
    battle.run('left', 1)

    const result = round(battle)
    expect(timeline(battle, result).some((step) => step.startsWith('move A solarbeam'))).toBe(true)
    expect(damaged(battle)).toEqual([])
  })
})

describe('the move Ally Switch', () => {
  // Players at x = -1.5 … 1.5; enemies at x = -0.5 and 0.5. "left" reaches A, B and C, not D.
  const field = () =>
    start(
      [
        player('A', 'Rattata', ['tackle']),
        player('B', 'Rattata', ['tackle']),
        player('C', 'Alakazam', ['allyswitch']),
        player('D', 'Rattata', ['tackle']),
      ],
      [enemy('left', 'Snorlax', ['tackle']), enemy('right', 'Snorlax', ['tackle'])],
    )

  it('trades the places of any two standing party members, the user included or not', () => {
    const others = field()
    round(others, { C: allySwitch('A', 'B') })
    expect(positions(others, 'players')).toBe('BACD')

    const self = field()
    round(self, { C: allySwitch('C', 'A') })
    expect(positions(self, 'players')).toBe('CBAD')
  })

  it('happens before ordinary moves, and a move locked on a Pokémon follows it to its new place', () => {
    const battle = field()
    const result = round(battle, { C: allySwitch('A', 'B'), left: move('tackle', 'B') })

    expect(timeline(battle, result)).toContain('move left tackle B')
    expect(damaged(battle)).toEqual(['B'])
  })

  it('makes a move fail when its target was moved out of reach', () => {
    const battle = field()
    const result = round(battle, { C: allySwitch('B', 'D'), left: move('tackle', 'B') })

    expect(positions(battle, 'players')).toBe('ADCB')
    expect(damaged(battle)).toEqual([])
    expect(result.log.some((entry) => entry.startsWith('|-fail|p2a: E1'))).toBe(true)
  })

  it('needs a pair of standing allies', () => {
    const battle = field()
    const refused = (action: RoundAction) => {
      try {
        round(battle, { C: action })
      } catch (error) {
        return error instanceof BattleRuleError ? error.code : 'other'
      }
      return 'accepted'
    }
    expect(refused(move('allyswitch'))).toBe('ally-switch')
    expect(refused(allySwitch('A', 'A'))).toBe('ally-switch')
    expect(refused(allySwitch('A', 'left'))).toBe('ally-switch')
    expect(refused({ type: 'move', move: 'allyswitch', target: 'A', allySwitch: ['A', 'B'] })).toBe('no-target')
  })

  it('does nothing when one of the pair went down before the move was used', () => {
    const battle = start(
      [
        player('A', 'Rattata', ['tackle'], { hp: 1 }),
        player('B', 'Rattata', ['tackle']),
        player('C', 'Slowpoke', ['allyswitch']),
      ],
      [enemy('foe', 'Jolteon', ['fakeout'])],
    )
    // Fake Out (+3) downs A before Ally Switch (+2).
    const result = round(battle, { C: allySwitch('A', 'B'), foe: move('fakeout', 'A') })

    expect(eventsOf(result, 'downed')).toHaveLength(1)
    expect(positions(battle, 'players')).toBe('ABC')
    expect(result.log.some((entry) => entry.startsWith('|-fail|') && entry.includes('Ally Switch'))).toBe(true)
  })
})

describe('Imposter', () => {
  it('copies the foe standing exactly opposite', () => {
    // Slot 0 faces slot 0: the engine's own rule would have copied the far end of the line.
    const battle = start(
      [player('ditto', 'Ditto', ['transform'], { ability: 'Imposter' }), player('other', 'Rattata', ['tackle'])],
      [enemy('facing', 'Machamp', ['tackle']), enemy('far', 'Snorlax', ['tackle'])],
    )
    expect(battle.combatant('ditto').species).toBe('machamp')
  })

  it('does nothing when no foe stands exactly opposite', () => {
    const battle = start(
      [player('ditto', 'Ditto', ['transform'], { ability: 'Imposter' }), player('other', 'Rattata', ['tackle'])],
      [enemy('boss', 'Snorlax', ['tackle'])],
    )
    expect(battle.combatant('ditto').species).toBe('ditto')
  })
})
