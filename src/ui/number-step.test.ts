import { describe, expect, it } from 'vitest'
import { HELD, holdStep, stepped, typedNumber } from './number-step'

describe('a number set with a minus and a plus', () => {
  it('goes by one while a button is held, then by ten', () => {
    expect(holdStep(HELD.delayMs)).toBe(1)
    expect(holdStep(HELD.fastAfterMs - 1)).toBe(1)
    expect(holdStep(HELD.fastAfterMs)).toBe(HELD.fastBy)
  })

  it('goes by its own size, however long it is held, when the button has one', () => {
    expect(holdStep(HELD.delayMs, 5)).toBe(5)
    expect(holdStep(HELD.fastAfterMs * 3, 5)).toBe(5)
  })

  it('stops at the lowest and at the highest it can be', () => {
    expect(stepped(5, 1, 0, 10)).toBe(6)
    expect(stepped(5, -1, 0, 10)).toBe(4)
    expect(stepped(248, 10, 0, 252)).toBe(252)
    expect(stepped(4, -10, 1, 100)).toBe(1)
    expect(stepped(10, 1, 0, 10)).toBe(10)
  })

  it('reads a typed whole number, and nothing else', () => {
    expect(typedNumber('252')).toBe(252)
    expect(typedNumber(' 7 ')).toBe(7)
    expect(typedNumber('007')).toBe(7)
    expect(typedNumber('')).toBeUndefined()
    expect(typedNumber('-3')).toBeUndefined()
    expect(typedNumber('1.5')).toBeUndefined()
    expect(typedNumber('12a')).toBeUndefined()
  })
})
