import { describe, expect, it } from 'vitest'
import { BattleRuleError } from './denborn-battle'
import { enemy, move, player, round, start, timeline } from './test-kit'

/** Who moved, in order. */
function movers(battle: ReturnType<typeof start>, result: ReturnType<typeof round>): string[] {
  return timeline(battle, result)
    .filter((step) => step.startsWith('move '))
    .map((step) => step.split(' ')[1] ?? '')
}

// Speeds: fast > mid > foe > slow.
function party(options: Parameters<typeof start>[2] = {}) {
  return start(
    [
      player('fast', 'Jolteon', ['tackle']),
      player('slow', 'Snorlax', ['tackle', 'gyroball']),
      player('mid', 'Machamp', ['tackle']),
    ],
    [enemy('foe', 'Chansey', ['tackle', 'quickattack'])],
    options,
  )
}

describe('Switch: exchanging Speed for turn order', () => {
  it('makes the two Pokémon act in each other\'s place, for one round only', () => {
    const battle = party()
    expect(movers(battle, round(battle))).toEqual(['fast', 'mid', 'foe', 'slow'])

    battle.exchangeSpeed('fast', 'slow')
    expect(movers(battle, round(battle))).toEqual(['slow', 'mid', 'foe', 'fast'])

    expect(movers(battle, round(battle))).toEqual(['fast', 'mid', 'foe', 'slow'])
  })

  it('chains: each exchange swaps what the two currently hold', () => {
    // The owner's example: A exchanges with B, then with C. A ends with C's Speed, B with A's, C with B's.
    const battle = party()
    battle.exchangeSpeed('fast', 'slow')
    battle.exchangeSpeed('fast', 'mid')
    expect(movers(battle, round(battle))).toEqual(['slow', 'fast', 'foe', 'mid'])
  })

  it('undoes itself when the same two exchange twice', () => {
    const battle = party()
    battle.exchangeSpeed('fast', 'slow')
    battle.exchangeSpeed('slow', 'fast')
    expect(movers(battle, round(battle))).toEqual(['fast', 'mid', 'foe', 'slow'])
  })

  it('leaves move priority alone', () => {
    const battle = party()
    battle.exchangeSpeed('fast', 'slow')
    const result = round(battle, { foe: move('quickattack', 'mid') })
    expect(movers(battle, result)).toEqual(['foe', 'slow', 'mid', 'fast'])
  })

  it('leaves the Speed that moves read alone: Gyro Ball keeps its power', () => {
    const power = (exchange: boolean) => {
      const battle = party({ debug: true })
      if (exchange) battle.exchangeSpeed('fast', 'slow')
      const result = round(battle, { slow: move('gyroball', 'foe') })
      return result.log.find((entry) => entry.startsWith('|debug|BP: '))
    }
    expect(power(false)).toMatch(/^\|debug\|BP: \d+$/)
    expect(power(true)).toBe(power(false))
  })

  it('is only for two different standing allies', () => {
    const battle = party()
    expect(() => battle.exchangeSpeed('fast', 'foe')).toThrow(BattleRuleError)
    expect(() => battle.exchangeSpeed('fast', 'fast')).toThrow(BattleRuleError)
  })
})
