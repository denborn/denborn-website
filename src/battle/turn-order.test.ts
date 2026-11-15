import { describe, expect, it } from 'vitest'
import { BattleRuleError } from './denborn-battle'
import type { BagEffect } from '../game-rules/bag-effects'
import type { RoundAction } from './denborn-battle'
import { bag, enemy, move, player, round, start, timeline, wait } from './test-kit'

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

/** Who acted, in order, whatever the action: a move, the Bag, WAIT. */
function actors(battle: ReturnType<typeof start>, result: ReturnType<typeof round>): string[] {
  return timeline(battle, result)
    .filter((step) => /^(move|bag|wait) /.test(step))
    .map((step) => step.split(' ')[1] ?? '')
}

// Made up for the tests: real items get their effects from the data pack.
const HEAL_20: BagEffect = { heal: 20 }

describe('the order shown before a round is played (decision 135)', () => {
  /** The order announced for these locked actions, and the order the engine then plays them in. */
  function announcedAndPlayed(battle: ReturnType<typeof start>, locked: Record<string, RoundAction>) {
    const everyone: Record<string, RoundAction> = { ...locked }
    for (const combatant of battle.combatants()) everyone[combatant.id] ??= move('splash')
    const announced = battle.turnOrder(everyone)
    return { announced, played: actors(battle, battle.resolveRound({ actions: everyone })) }
  }

  it('is by Speed while nothing is locked', () => {
    expect(party().turnOrder({})).toEqual(['fast', 'mid', 'foe', 'slow'])
  })

  it('moves with what is locked, and is the order the round is then played in', () => {
    // A priority move first, the Bag next (+1), then Speed; WAIT stands where an ordinary move would.
    const { announced, played } = announcedAndPlayed(party(), {
      foe: move('quickattack', 'mid'),
      slow: bag('medicine', 'slow', HEAL_20),
      fast: wait,
      mid: move('tackle', 'foe'),
    })
    expect(announced).toEqual(['foe', 'slow', 'fast', 'mid'])
    expect(played).toEqual(announced)
  })

  it('follows a Speed exchange', () => {
    const battle = party()
    battle.exchangeSpeed('fast', 'slow')
    const { announced, played } = announcedAndPlayed(battle, {})
    expect(announced).toEqual(['slow', 'mid', 'foe', 'fast'])
    expect(played).toEqual(announced)
  })

  it('follows what changes Speed or turns the order around', () => {
    // Agility doubles the slowest's Speed: from the next round on it passes two of the others.
    const quickened = start(
      [player('fast', 'Jolteon', ['tackle']), player('slow', 'Snorlax', ['agility']), player('mid', 'Machamp', ['tackle'])],
      [enemy('foe', 'Chansey', ['tackle'])],
    )
    round(quickened, { slow: move('agility') })
    const after = announcedAndPlayed(quickened, {})
    expect(after.announced).toEqual(['fast', 'slow', 'mid', 'foe'])
    expect(after.played).toEqual(after.announced)

    // Trick Room: the slowest first, for as long as it lasts.
    const room = start(
      [player('fast', 'Jolteon', ['tackle']), player('slow', 'Snorlax', ['tackle'])],
      [enemy('foe', 'Chansey', ['trickroom'])],
    )
    round(room, { foe: move('trickroom') })
    const { announced, played } = announcedAndPlayed(room, {})
    expect(announced).toEqual(['slow', 'foe', 'fast'])
    expect(played).toEqual(announced)
  })

  it('counts what an Ability adds to a move\'s priority', () => {
    // Prankster: a status move goes first.
    const battle = start(
      [player('trick', 'Sableye', ['willowisp'], { ability: 'prankster' }), player('fast', 'Jolteon', ['tackle'])],
      [enemy('foe', 'Chansey', ['tackle'])],
    )
    const { announced, played } = announcedAndPlayed(battle, { trick: move('willowisp', 'foe'), fast: move('tackle', 'foe') })
    expect(announced).toEqual(['trick', 'fast', 'foe'])
    expect(played).toEqual(announced)
  })

  it('leaves out who has no turn, and keeps a Pokémon locked into a move where that move puts it', () => {
    const battle = start(
      [player('one', 'Snorlax', ['tackle'], { hp: 1 }), player('two', 'Machamp', ['tackle'])],
      [enemy('foe', 'Jolteon', ['tackle', 'outrage'])],
    )
    round(battle, { foe: move('tackle', 'one') })
    expect(battle.combatant('one').downed).toBe(true)
    expect(battle.turnOrder({})).toEqual(['foe', 'two'])
  })
})
