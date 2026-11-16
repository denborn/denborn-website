import { describe, expect, it } from 'vitest'
import { STORM, boltOnto, boltPath, nextStrike } from './storm'

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('when lightning strikes', () => {
  it('waits between the shortest and the longest gap', () => {
    const random = seeded(1)
    for (let draw = 0; draw < 2000; draw++) {
      const { wait, again } = nextStrike(random)
      expect(wait).toBeGreaterThanOrEqual(STORM.gap[0])
      expect(wait).toBeLessThanOrEqual(STORM.gap[1])
      if (again !== undefined) {
        expect(again).toBeGreaterThanOrEqual(STORM.doubleGap[0])
        expect(again).toBeLessThanOrEqual(STORM.doubleGap[1])
      }
    }
  })

  it('strikes twice now and then, and once otherwise', () => {
    expect(nextStrike(() => 0).again).toBeDefined()
    expect(nextStrike(() => 0.99).again).toBeUndefined()
  })

  it('falls on the den now and then, and in the sky otherwise', () => {
    expect(nextStrike(() => 0).onDen).toBe(true)
    expect(nextStrike(() => 0.99).onDen).toBe(false)
  })

  it('never flashes more than three times in any second', () => {
    const random = seeded(7)
    const flashes: number[] = []
    let time = 0
    for (let strike = 0; strike < 2000; strike++) {
      const { wait, again } = nextStrike(random)
      time += wait
      flashes.push(time)
      if (again !== undefined) flashes.push(time + again)
    }
    flashes.sort((a, b) => a - b)
    for (let index = 3; index < flashes.length; index++) {
      expect((flashes[index] ?? 0) - (flashes[index - 3] ?? 0)).toBeGreaterThan(1000)
    }
  })
})

describe('a bolt', () => {
  const sky = { left: 14, top: 20, right: 225, bottom: 158 }
  const light = { left: 99, right: 137 }

  it.each(Array.from({ length: 200 }, (_, seed) => seed))('stays in the visible sky, clear of the light, in one piece (seed %i)', (seed) => {
    const bolt = boltPath(seeded(seed), sky, light)
    expect(bolt[0]?.y).toBe(sky.top)
    for (const point of bolt) {
      // The bolt is drawn from one pixel left of a point to two right of it.
      expect(point.x - 1).toBeGreaterThanOrEqual(sky.left)
      expect(point.x + 2).toBeLessThan(sky.right)
      expect(point.y).toBeGreaterThanOrEqual(sky.top)
      expect(point.y).toBeLessThan(sky.bottom)
      expect(point.x + 2 < light.left || point.x - 1 >= light.right).toBe(true)
      if (point.y > sky.top) {
        expect(bolt.some((above) => above.y === point.y - 1 && Math.abs(above.x - point.x) <= 1)).toBe(true)
      }
    }
    // Into the sky, not down to the den.
    expect(Math.max(...bolt.map((point) => point.y)) - sky.top).toBeLessThanOrEqual(Math.round((sky.bottom - sky.top) * 0.55))
  })

  it('strikes on the side that has room when the other has none', () => {
    const narrow = { left: 95, top: 0, right: 200, bottom: 158 }
    for (let seed = 0; seed < 50; seed++) {
      expect(boltPath(seeded(seed), narrow, light).every((point) => point.x >= light.right)).toBe(true)
    }
  })
})

describe('a bolt that falls on the den', () => {
  const sky = { left: 0, top: 23, right: 160, bottom: 158 }
  const den = { x: 72, y: 114 }

  it.each(Array.from({ length: 200 }, (_, seed) => seed))('comes down from the top and ends on the den, in one piece (seed %i)', (seed) => {
    const bolt = boltOnto(seeded(seed), sky, den)
    expect(bolt[0]?.y).toBe(sky.top)
    expect(bolt[bolt.length - 1]).toEqual(den)
    bolt.forEach((point, index) => {
      expect(point.x - 1).toBeGreaterThanOrEqual(sky.left)
      expect(point.x + 2).toBeLessThan(sky.right)
      const before = bolt[index - 1]
      if (before) {
        expect(point.y).toBe(before.y + 1)
        expect(Math.abs(point.x - before.x)).toBeLessThanOrEqual(1)
      }
    })
  })

  it('reaches a den near the edge of what the screen shows', () => {
    const bolt = boltOnto(seeded(3), sky, { x: 0, y: 60 })
    expect(bolt[bolt.length - 1]).toEqual({ x: 1, y: 60 })
  })
})
