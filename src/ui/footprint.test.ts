import { describe, expect, it } from 'vitest'
import { FOOTPRINT, centreShift, footprintOf, shadowOf } from './footprint'

/** A sprite drawn from rows of text: `#` a pixel drawn, `.` an empty one. */
function sprite(...rows: string[]): { opacity: (x: number, y: number) => number; width: number; height: number } {
  return { opacity: (x, y) => (rows[y]?.[x] === '#' ? 255 : 0), width: rows[0]?.length ?? 0, height: rows.length }
}

describe('where its feet are', () => {
  it('is what is drawn on its lowest rows, not the width of its head or of the picture', () => {
    const { opacity, width, height } = sprite(
      '..........',
      '.########.',
      '..######..',
      '...####...',
      '...#..#...',
      '...#..#...',
      '..........',
    )
    expect(footprintOf(opacity, width, height)).toEqual({ left: 3, right: 7 })
  })

  it('is to one side when the Pokémon stands to one side of its picture', () => {
    const { opacity, width, height } = sprite('......###.', '......###.', '.......##.', '.......##.')
    expect(footprintOf(opacity, width, height)).toEqual({ left: 7, right: 9 })
  })

  it('is nothing for a picture with nothing drawn', () => {
    const { opacity, width, height } = sprite('....', '....')
    expect(footprintOf(opacity, width, height)).toBeUndefined()
  })
})

describe('its shadow', () => {
  it('is a little wider than its feet, flat, and in their middle', () => {
    const shadow = shadowOf({ left: 3, right: 7 }, 10, false)
    expect(shadow.width).toBeCloseTo(4 * (1 + FOOTPRINT.wider))
    expect(shadow.height).toBeCloseTo(Math.max(2, shadow.width * FOOTPRINT.flat))
    expect(shadow.offset).toBe(0)
  })

  it('follows feet off the middle, and goes the other way when the sprite is mirrored', () => {
    expect(shadowOf({ left: 7, right: 9 }, 10, false).offset).toBe(3)
    expect(shadowOf({ left: 7, right: 9 }, 10, true).offset).toBe(-3)
  })
})

describe('where it stands', () => {
  it('is the middle of its feet: a picture wider on one side is moved the other way', () => {
    // A tail to the right of the picture: the feet are at 2 to 4 of 10, so it moves 2 to the right.
    expect(centreShift({ left: 2, right: 4 }, 10, false)).toBe(2)
    expect(centreShift({ left: 4, right: 6 }, 10, false)).toBe(0)
  })

  it('moves the other way when the sprite is mirrored', () => {
    expect(centreShift({ left: 2, right: 4 }, 10, true)).toBe(-2)
  })
})
