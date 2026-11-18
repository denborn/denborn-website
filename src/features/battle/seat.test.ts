import { describe, expect, it } from 'vitest'
import { extrasStep, nextToPlay, playedByGm, toCommand, toIntent } from './seat'

const on = (id: string, side: 'players' | 'enemies', dead = false) => ({ id, side, dead })

describe('what a player asks, as the intent their device sends', () => {
  it('sends a lock, a swap, an answer and a withdrawal as they are', () => {
    expect(toIntent({ do: 'lock', choice: { do: 'move', move: 'tackle', target: 'foe' } })).toEqual({ do: 'lock', choice: { do: 'move', move: 'tackle', target: 'foe' } })
    expect(toIntent({ do: 'unlock' })).toEqual({ do: 'unlock' })
    expect(toIntent({ do: 'run', with: 'bob' })).toEqual({ do: 'run', with: 'bob' })
    expect(toIntent({ do: 'switch', with: 'bob' })).toEqual({ do: 'switch', with: 'bob' })
    expect(toIntent({ do: 'answer', kind: 'run', from: 'bob', accept: false })).toEqual({ do: 'answer', kind: 'run', from: 'bob', accept: false })
    expect(toIntent({ do: 'withdraw', kind: 'switch' })).toEqual({ do: 'withdraw', kind: 'switch' })
  })

  it('sends nothing for what is not a player’s to ask: Struggle, extra moves', () => {
    expect(toIntent({ do: 'lock', choice: { do: 'struggle' } })).toBeUndefined()
    expect(toIntent({ do: 'lock', choice: { do: 'wait' }, extra: [{ move: 'tackle' }] })).toBeUndefined()
  })
})

describe('what the game master asks, as a command for the Pokémon played', () => {
  it('names the Pokémon and carries its extra moves', () => {
    expect(toCommand({ do: 'lock', choice: { do: 'wait' }, extra: [{ move: 'roar' }] }, 'boss')).toEqual({ do: 'lock', who: 'boss', choice: { do: 'wait' }, extra: [{ move: 'roar' }] })
    expect(toCommand({ do: 'lock', choice: { do: 'struggle' } }, 'ann')).toEqual({ do: 'lock', who: 'ann', choice: { do: 'struggle' }, extra: [] })
    expect(toCommand({ do: 'unlock' }, 'boss')).toEqual({ do: 'unlock', who: 'boss' })
    expect(toCommand({ do: 'run', with: 'rat' }, 'boss')).toEqual({ do: 'run', who: 'boss', with: 'rat' })
    expect(toCommand({ do: 'switch', with: 'rat' }, 'boss')).toEqual({ do: 'switch', who: 'boss', with: 'rat' })
    expect(toCommand({ do: 'answer', kind: 'switch', from: 'bob', accept: true }, 'ann')).toEqual({ do: 'answer', who: 'ann', kind: 'switch', from: 'bob', accept: true })
    expect(toCommand({ do: 'withdraw', kind: 'run' }, 'ann')).toEqual({ do: 'withdraw', who: 'ann', kind: 'run' })
  })
})

describe('whom the game master plays', () => {
  const field = [on('ann', 'players'), on('bob', 'players'), on('rat', 'enemies'), on('bat', 'enemies'), on('old', 'enemies', true)]

  it('may play every enemy still in the fight, and the Pokémon of a player who is away', () => {
    expect(playedByGm(field, [])).toEqual(['rat', 'bat'])
    expect(playedByGm(field, ['bob'])).toEqual(['bob', 'rat', 'bat'])
  })

  it('is offered next the first in the round’s order that still has to choose', () => {
    const toChoose = (id: string): boolean => id !== 'rat'
    expect(nextToPlay(['rat', 'ann', 'bat'], ['rat', 'bat'], toChoose)).toBe('bat')
    // One that is not in the order (it would not act yet) is still offered.
    expect(nextToPlay(['ann'], ['rat', 'bat'], toChoose)).toBe('bat')
    expect(nextToPlay(['rat', 'bat'], ['rat', 'bat'], () => false)).toBeUndefined()
  })
})

describe('an enemy’s extra moves, lined up before its move', () => {
  it('adds one after the others and removes the last', () => {
    const one = extrasStep([], { do: 'add', move: { move: 'roar' } })
    const two = extrasStep(one, { do: 'add', move: { move: 'tackle', target: 'ann' } })
    expect(two).toEqual([{ move: 'roar' }, { move: 'tackle', target: 'ann' }])
    expect(extrasStep(two, { do: 'removeLast' })).toEqual([{ move: 'roar' }])
    expect(one).toEqual([{ move: 'roar' }])
  })
})
