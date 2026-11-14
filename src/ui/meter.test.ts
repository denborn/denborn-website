import { describe, expect, it } from 'vitest'
import { fillRatio, hpTone } from './meter'

describe('HP bar', () => {
  it('is green above half, yellow down to a fifth, red at a fifth or less', () => {
    expect(hpTone(100, 100)).toBe('high')
    expect(hpTone(51, 100)).toBe('high')
    expect(hpTone(50, 100)).toBe('mid')
    expect(hpTone(21, 100)).toBe('mid')
    expect(hpTone(20, 100)).toBe('low')
    expect(hpTone(0, 100)).toBe('low')
  })

  it('never looks empty while any HP is left, and never overflows', () => {
    expect(fillRatio(1, 714)).toBeGreaterThan(0)
    expect(fillRatio(1, 714)).toBe(1 / 48)
    expect(fillRatio(0, 714)).toBe(0)
    expect(fillRatio(999, 100)).toBe(1)
    expect(fillRatio(50, 100)).toBe(0.5)
  })
})
