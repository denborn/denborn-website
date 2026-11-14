import { describe, expect, it } from 'vitest'
import { eligibleMoves, isEligible } from './eligibility'
import { mergeStages, readSources } from './learnset'

// All learnsets here are made up.

describe('reading learnset sources', () => {
  it('takes the level from the newest generation that teaches the move by level-up', () => {
    expect(readSources(['9L7', '8L1', '7L3'])).toEqual({ level: 7 })
    // Not learned by level-up in the newest generations: the older level stands.
    expect(readSources(['9M', '6L20'])).toEqual({ level: 20, tm: true })
    // Listed twice in the same generation: the lower level.
    expect(readSources(['9L30', '9L12'])).toEqual({ level: 12 })
  })

  it('counts a move learned on evolution as level 0', () => {
    expect(readSources(['9L0'])).toEqual({ level: 0 })
  })

  it('counts TM, tutor and egg sources of any generation, and special breeding as an egg move', () => {
    expect(readSources(['4M', '5T', '3E'])).toEqual({ tm: true, tutor: true, egg: true })
    expect(readSources(['9R'])).toEqual({ egg: true })
  })

  it('does not count event, transfer-only or Dream World sources', () => {
    expect(readSources(['5S0', '7V', '5D'])).toEqual({})
  })

  it('refuses a source it cannot read', () => {
    expect(() => readSources(['9X'])).toThrow()
    expect(() => readSources(['level 5'])).toThrow()
  })
})

describe('merging a species with its earlier stages', () => {
  const baby = { spark: ['9L4'], charm: ['9E'], gift: ['5S0'] }
  const middle = { spark: ['9L1'], bolt: ['9L26'], surf: ['8M'] }
  const final = { bolt: ['9L0'], slam: ['7T'] }

  it('keeps every move any stage can have, at the lowest level any stage learns it', () => {
    expect(mergeStages([final, middle, baby])).toEqual([
      { move: 'bolt', level: 0 },
      { move: 'charm', egg: true },
      { move: 'slam', tutor: true },
      { move: 'spark', level: 1 },
      { move: 'surf', tm: true },
    ])
  })

  it('leaves out a move no stage can really learn', () => {
    expect(mergeStages([baby]).map((entry) => entry.move)).not.toContain('gift')
  })
})

describe('eligible moves', () => {
  const learnset = mergeStages([{ tackle: ['9L1'], bolt: ['9L26'], evolve: ['9L0'], surf: ['8M'], charm: ['9E'], slam: ['7T'] }])
  const ids = (level: number, access: Parameters<typeof eligibleMoves>[2], common: string[] = []) =>
    eligibleMoves(learnset, level, access, common)

  it('offers level-up moves at or below the level, evolution moves included', () => {
    expect(ids(1, 'level-up')).toEqual(['evolve', 'tackle'])
    expect(ids(25, 'level-up')).toEqual(['evolve', 'tackle'])
    expect(ids(26, 'level-up')).toEqual(['bolt', 'evolve', 'tackle'])
  })

  it('adds TM, tutor and egg moves only when the campaign allows them', () => {
    expect(ids(1, 'level-up-tm-tutor-egg')).toEqual(['charm', 'evolve', 'slam', 'surf', 'tackle'])
    expect(isEligible({ move: 'surf', tm: true }, 100, 'level-up')).toBe(false)
  })

  it('adds the campaign\'s common moves once', () => {
    expect(ids(1, 'level-up', ['protect', 'tackle'])).toEqual(['evolve', 'tackle', 'protect'])
  })
})
