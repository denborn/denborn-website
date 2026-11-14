import { describe, expect, it } from 'vitest'
import { MAX_LEVEL, expForLevel, levelForExp } from './exp'

describe('levels and EXP', () => {
  it('starts level 1 at no EXP', () => {
    expect(expForLevel(1)).toBe(0)
    expect(levelForExp(0)).toBe(1)
  })

  it('gives back the level whose threshold was just reached, for every level', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) expect(levelForExp(expForLevel(level))).toBe(level)
  })

  it('stays on a level until the next threshold', () => {
    expect(levelForExp(expForLevel(2) - 1)).toBe(1)
    expect(levelForExp(expForLevel(37) - 1)).toBe(36)
    expect(levelForExp(expForLevel(37) + 1)).toBe(37)
  })

  it('stops at level 100 however much EXP there is', () => {
    expect(levelForExp(expForLevel(MAX_LEVEL) * 10)).toBe(MAX_LEVEL)
  })
})
