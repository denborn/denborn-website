import { describe, expect, it } from 'vitest'
import { TITLE_DEN, TITLE_PLAIN } from '../data/sprites'
import { GHOST, chanceOf, driftOf, ghostPixel, glowAt, goneAt, swayAt, waveAt } from './ghost'
import { fitScene } from './scene-fit'
import { walkerPixel } from './wander'

/** Every frame of a rise that lasts `life` milliseconds. */
const framesOf = (life: number): number[] => Array.from({ length: Math.floor(life / GHOST.frame) + 1 }, (_, frame) => frame * GHOST.frame)

describe('a ghost in the light', () => {
  it('sways in whole pixels, as far as its reach on either side and no further', () => {
    const reach = 7
    const sways = framesOf(GHOST.swayEvery).map((elapsed) => swayAt(elapsed, reach))
    expect(sways.every((sway) => Number.isInteger(sway))).toBe(true)
    expect(Math.min(...sways)).toBe(-reach)
    expect(Math.max(...sways)).toBe(reach)
  })

  it('stays where it is when it has no room to sway', () => {
    expect(framesOf(GHOST.swayEvery).every((elapsed) => swayAt(elapsed, 0) === 0)).toBe(true)
  })

  it('wavers by one pixel at most, not all its rows the same way', () => {
    const waves = Array.from({ length: GHOST.waveRows }, (_, row) => waveAt(row, 400))
    expect(waves.every((wave) => wave === -1 || wave === 0 || wave === 1)).toBe(true)
    expect(new Set(waves).size).toBeGreaterThan(1)
  })

  it('glows more and less, never under its least and never over the whole', () => {
    const glows = framesOf(GHOST.glowEvery).map(glowAt)
    expect(Math.min(...glows)).toBeGreaterThanOrEqual(GHOST.glowLeast)
    expect(Math.max(...glows)).toBeLessThanOrEqual(1)
    expect(Math.max(...glows) - Math.min(...glows)).toBeGreaterThan(0.3)
  })
})

describe('a ghost breaking up', () => {
  const life = 6000
  const squares = Array.from({ length: 400 }, (_, square) => chanceOf(square % 20, Math.floor(square / 20)))

  it('is whole for the first part of its rise: no square has moved', () => {
    for (const elapsed of framesOf(life * GHOST.whole)) {
      expect(squares.every((chance) => driftOf(chance, goneAt(elapsed, life)) === 0)).toBe(true)
    }
  })

  it('is gone by the end of its rise: no square is left', () => {
    expect(goneAt(life, life)).toBe(1)
    expect(squares.every((chance) => driftOf(chance, 1) === undefined)).toBe(true)
  })

  it('loses its squares one after the other, not all at once', () => {
    const left = (gone: number): number => squares.filter((chance) => driftOf(chance, gone) !== undefined).length
    expect(left(0.5)).toBeGreaterThan(0)
    expect(left(0.5)).toBeLessThan(squares.length)
    expect(left(0.8)).toBeLessThan(left(0.5))
  })

  it('has each square only ever go up, then go for good', () => {
    for (const chance of squares) {
      let before: number | undefined = 0
      for (const elapsed of framesOf(life)) {
        const drift = driftOf(chance, goneAt(elapsed, life))
        if (before === undefined) expect(drift).toBeUndefined()
        else if (drift !== undefined) expect(drift).toBeGreaterThanOrEqual(before)
        before = drift
      }
    }
  })
})

describe("a ghost's size", () => {
  const PHONES = [
    { width: 320, ratio: 2 },
    { width: 412, ratio: 2.625 },
    { width: 480, ratio: 3 },
  ] as const

  it.each(PHONES)('is whole device pixels on a $width px phone, and smaller than a walker’s', ({ width, ratio }) => {
    const scenePixel = fitScene(TITLE_PLAIN, width, ratio, TITLE_DEN.middle.x).pixel
    const devicePixels = ghostPixel(scenePixel, ratio) * ratio
    expect(devicePixels).toBeCloseTo(Math.round(devicePixels), 9)
    expect(devicePixels).toBeGreaterThanOrEqual(1)
    expect(ghostPixel(scenePixel, ratio)).toBeLessThan(walkerPixel(scenePixel, ratio))
  })

  it('is one device pixel where a walker’s is no more than that: nothing is drawn smaller', () => {
    expect(ghostPixel(1, 1)).toBe(1)
    expect(ghostPixel(1, 1)).toBe(walkerPixel(1, 1))
  })
})
