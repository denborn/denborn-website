import { describe, expect, it } from 'vitest'
import { BattleRuleError } from './denborn-battle'
import { damaged, enemy, move, player, round, seedNumber, start, struggle } from './test-kit'

const LETTERS = 'ABCDEF'

/** `count` players lettered A, B, C… facing the given enemies. */
function line(count: number, moves: string[]) {
  return Array.from({ length: count }, (_, index) => player(LETTERS.charAt(index), 'Rattata', moves))
}

function targetsOf(battle: ReturnType<typeof start>, id: string, moveId: string): string[] {
  const option = battle.request(id).moves.find((candidate) => candidate.id === moveId)
  if (!option) throw new Error(`${id} does not know ${moveId}`)
  return option.targets
}

describe('reach on lines of different lengths', () => {
  // The owner's examples (DECISIONS.md 1.1): who can reach a lone boss.
  it.each([
    [3, 'ABC'],
    [4, 'BC'],
    [6, 'CD'],
  ])('with %i players, a lone boss is in reach of %s only', (count, expected) => {
    const battle = start(line(count, ['tackle', 'aerialace']), [enemy('boss', 'Snorlax', ['tackle'])])

    const reaching = LETTERS.slice(0, count)
      .split('')
      .filter((id) => targetsOf(battle, id, 'tackle').includes('boss'))
    expect(reaching.join('')).toBe(expected)

    // Reach is the same from the other side.
    expect(targetsOf(battle, 'boss', 'tackle').sort().join('')).toBe(expected)

    // A move that can target anyone reaches from every slot.
    for (const id of LETTERS.slice(0, count)) expect(targetsOf(battle, id, 'aerialace')).toContain('boss')
  })

  it('refuses a move locked on a foe that is out of reach, and plays nothing', () => {
    const battle = start(line(6, ['tackle']), [enemy('boss', 'Snorlax', ['tackle'])])

    expect(() => round(battle, { A: move('tackle', 'boss') })).toThrow(BattleRuleError)
    expect(battle.round).toBe(1)
    expect(damaged(battle)).toEqual([])

    // The same round can then be played with a legal choice.
    round(battle, { C: move('tackle', 'boss') })
    expect(battle.round).toBe(2)
    expect(damaged(battle)).toEqual(['boss'])
  })

  it('makes a spread move hit adjacent foes only', () => {
    // Players sit at x = -1, 0, 1; enemies at x = -2 … 2.
    const enemies = ['v', 'w', 'x', 'y', 'z'].map((id) => enemy(id, 'Rattata', ['tackle']))
    const battle = start(line(3, ['swift', 'earthquake']), enemies)

    // A, at x = -1, reaches the foes at x = -2, -1 and 0.
    round(battle, { A: move('swift') })
    expect(damaged(battle)).toEqual(['v', 'w', 'x'])
  })

  it('makes an all-adjacent move hit neighbours on both lines', () => {
    const enemies = ['v', 'w', 'x', 'y', 'z'].map((id) => enemy(id, 'Rattata', ['tackle']))
    const battle = start(line(3, ['swift', 'earthquake']), enemies)

    round(battle, { B: move('earthquake') })
    expect(damaged(battle)).toEqual(['A', 'C', 'w', 'x', 'y'])
  })

  it('lets a single Pokémon face six, and six face one', () => {
    const many = start(line(6, ['tackle']), [enemy('boss', 'Snorlax', ['swift'])])
    round(many, { boss: move('swift'), D: move('tackle', 'boss') })
    expect(damaged(many)).toEqual(['C', 'D', 'boss'])

    const alone = start([player('hero', 'Snorlax', ['swift'])], ['u', 'v', 'w', 'x', 'y', 'z'].map((id) => enemy(id, 'Rattata', ['tackle'])))
    round(alone, { hero: move('swift'), w: move('tackle', 'hero') })
    expect(damaged(alone)).toEqual(['hero', 'w', 'x'])
  })
})

describe('random targets', () => {
  it('only ever picks a foe in reach', () => {
    const struck = new Set<string>()
    for (let n = 1; n <= 40; n++) {
      const battle = start(line(4, ['tackle']), [enemy('boss', 'Snorlax', ['tackle'])], { seed: seedNumber(n) })
      round(battle, { boss: struggle })
      for (const id of damaged(battle)) if (id !== 'boss') struck.add(id)
    }
    // Struggle hurts its user too; of the players, only B and C stand in the boss's reach.
    expect([...struck].sort()).toEqual(['B', 'C'])
  })

  it('fails when no foe is in reach', () => {
    const battle = start(line(4, ['tackle']), [enemy('boss', 'Snorlax', ['tackle'])])
    const result = round(battle, { A: struggle })
    expect(damaged(battle)).toEqual([])
    expect(result.log.some((entry) => entry.startsWith('|-fail|p1a: P1'))).toBe(true)
  })
})
