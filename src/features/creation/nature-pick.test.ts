import { describe, expect, it } from 'vitest'
import { testPack } from '../../domain/test-pack'
import { NATURE_STATS, natureFor, statsOf } from './nature-pick'

/** The test pack's two: one that raises Defense and lowers Attack, one that changes nothing. */
const natures = testPack.natures

describe('a nature named by what it does', () => {
  it('is the one that raises the first stat and lowers the second', () => {
    expect(natureFor(natures, 'def', 'atk')).toBe('bold')
  })

  it('is one that changes nothing when the same stat is raised and lowered', () => {
    expect(natureFor(natures, 'spe', 'spe')).toBe('plain')
  })

  it('is none when the game data has no such nature', () => {
    expect(natureFor(natures, 'atk', 'def')).toBeUndefined()
    expect(natureFor({ bold: natures.bold ?? { id: 'bold', name: { en: '', fr: '' } } }, 'atk', 'atk')).toBeUndefined()
  })
})

describe('what a nature does', () => {
  it('is its two stats', () => {
    expect(statsOf(natures, 'bold')).toEqual({ raised: 'def', lowered: 'atk' })
  })

  it('is the same stat twice for one that changes nothing', () => {
    const neutral = statsOf(natures, 'plain')
    expect(neutral?.raised).toBe(neutral?.lowered)
    expect(NATURE_STATS).toContain(neutral?.raised)
  })

  it('is nothing for no nature, or one the game data does not have', () => {
    expect(statsOf(natures, undefined)).toBeUndefined()
    expect(statsOf(natures, 'unknown')).toBeUndefined()
  })

  it('names the same nature again', () => {
    for (const id of Object.keys(natures)) {
      const does = statsOf(natures, id)
      expect(does && natureFor(natures, does.raised, does.lowered)).toBe(id)
    }
  })
})
