import { describe, expect, it } from 'vitest'
import { BattleRuleError } from './denborn-battle'
import { enemy, eventsOf, move, player, round, start, timeline, wait } from './test-kit'

/** The rounds, up to `most`, in which `id` could not act because it slept. */
function roundsAsleep(action: 'wait' | 'splash', most: number): number[] {
  const battle = start([player('dozer', 'Snorlax', ['tackle'], { status: 'slp' })], [enemy('foe', 'Chansey', ['tackle'])])
  const asleep: number[] = []
  for (let number = 1; number <= most; number++) {
    const result = round(battle, { dozer: action === 'wait' ? wait : move('splash') })
    if (timeline(battle, result).includes('cant dozer slp')) asleep.push(number)
  }
  return asleep
}

describe('WAIT (decisions 137 and 144)', () => {
  it('does nothing: no move is used, no PP is spent, nobody is hurt', () => {
    const battle = start([player('one', 'Jolteon', ['tackle'])], [enemy('foe', 'Chansey', ['tackle'])])
    const result = round(battle, { one: wait })
    expect(eventsOf(result, 'wait')).toEqual([{ type: 'wait', id: 'one' }])
    expect(timeline(battle, result).filter((step) => step.startsWith('move one'))).toEqual([])
    expect(battle.combatant('one').moves.every((slot) => slot.pp === slot.maxPp)).toBe(true)
    expect(battle.combatant('foe').hp).toBe(battle.combatant('foe').maxHp)
  })

  it('comes where an ordinary move would: after priority moves, at the Pokémon\'s Speed', () => {
    // Speeds: quick > jab > walker.
    const battle = start(
      [player('quick', 'Jolteon', ['tackle'])],
      [enemy('jab', 'Pikachu', ['quickattack']), enemy('walker', 'Slowpoke', ['tackle'])],
    )
    const result = round(battle, { quick: wait, jab: move('quickattack', 'quick'), walker: move('tackle', 'quick') })
    const steps = timeline(battle, result)
      .filter((step) => step.startsWith('move ') || step.startsWith('wait '))
      .map((step) => step.split(' ').slice(0, 2).join(' '))
    expect(steps).toEqual(['move jab', 'wait quick', 'move walker'])
  })

  it('lets the turn pass for the Pokémon\'s conditions: it sleeps exactly as long as if it used a move', () => {
    const waiting = roundsAsleep('wait', 6)
    expect(waiting.length).toBeGreaterThan(0)
    expect(waiting).toEqual(roundsAsleep('splash', 6))
  })

  it('is stopped like a move: a Pokémon that cannot act is not said to wait', () => {
    const battle = start([player('dozer', 'Snorlax', ['tackle'], { status: 'slp' })], [enemy('foe', 'Chansey', ['tackle'])])
    const result = round(battle, { dozer: wait })
    expect(timeline(battle, result)).toContain('cant dozer slp')
    expect(eventsOf(result, 'wait')).toEqual([])
  })

  it('counts as the Pokémon having acted: a move for its first turn out no longer works', () => {
    const battle = start([player('one', 'Persian', ['fakeout'])], [enemy('foe', 'Chansey', ['tackle'])])
    round(battle, { one: wait })
    round(battle, { one: move('fakeout', 'foe') })
    expect(battle.combatant('foe').hp).toBe(battle.combatant('foe').maxHp)
  })

  it('is not for a Pokémon locked into a move: it has no choice (decision 145)', () => {
    const battle = start([player('one', 'Chansey', ['tackle'])], [enemy('foe', 'Snorlax', ['outrage', 'tackle'])])
    round(battle, { foe: move('outrage') })
    expect(() => round(battle, { foe: wait })).toThrow(BattleRuleError)
    expect(timeline(battle, round(battle))).toContain('move foe outrage one')
  })

  it('is lost, with nothing shown, when the Pokémon goes down first', () => {
    const battle = start([player('one', 'Snorlax', ['tackle'], { hp: 1 })], [enemy('foe', 'Jolteon', ['tackle'])])
    const result = round(battle, { one: wait, foe: move('tackle', 'one') })
    expect(battle.combatant('one').downed).toBe(true)
    expect(eventsOf(result, 'wait')).toEqual([])
  })
})
