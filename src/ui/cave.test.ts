import { describe, expect, it } from 'vitest'
import { CAVE, type Pixels, type Rgb, caveInside, onRamp, placeCave, rgbOf, shadeAt } from './cave'

/** A picture enlarged three times from `width` by `height`, its left half one grey and its right half another. */
function halves(width: number, height: number, left: number, right: number): Pixels {
  const data = new Uint8ClampedArray(width * 3 * height * 3 * 4)
  for (let y = 0; y < height * 3; y++) {
    for (let x = 0; x < width * 3; x++) {
      const grey = x < (width * 3) / 2 ? left : right
      data.set([grey, grey, grey, 255], (y * width * 3 + x) * 4)
    }
  }
  return { data, width: width * 3, height: height * 3 }
}

const RAMP: readonly Rgb[] = [
  [16, 9, 13],
  [63, 43, 51],
  [148, 108, 107],
]

describe('the inside of the den', () => {
  const own = { width: 40, height: 30 }
  const light = { x: 12, y: 20 }

  it('is the whole picture, on its own pixels, opaque', () => {
    const inside = caveInside(halves(40, 30, 40, 200), own, RAMP, light)
    expect(inside.width).toBe(40)
    expect(inside.height).toBe(30)
    for (let at = 3; at < inside.data.length; at += 4) expect(inside.data[at]).toBe(255)
  })

  it('puts the darkest of the picture on the ramp’s first colour where the light falls', () => {
    const inside = caveInside(halves(40, 30, 40, 200), own, RAMP, light)
    const at = (light.y * own.width + light.x) * 4
    expect(shadeAt(light.x, light.y, own.width, own.height, light)).toBe(1)
    expect([...inside.data.subarray(at, at + 3)]).toEqual([16, 9, 13])
  })

  it('never goes past its top share of the ramp: the den’s lit side is not reached', () => {
    const inside = caveInside(halves(40, 30, 40, 200), own, RAMP, light)
    const top = onRamp(RAMP, CAVE.top)
    for (let at = 0; at < inside.data.length; at += 4) {
      for (let channel = 0; channel < 3; channel++) expect(inside.data[at + channel]).toBeLessThanOrEqual(Math.round(top[channel as 0 | 1 | 2]))
    }
  })

  it('is darker away from the light, by no more than its strength', () => {
    expect(shadeAt(39, 0, own.width, own.height, light)).toBeLessThan(1)
    expect(shadeAt(39, 0, own.width, own.height, light)).toBeGreaterThanOrEqual(1 - CAVE.strength)
  })
})

describe('where the cave is drawn', () => {
  const screen = { width: 400, height: 300 }
  const own = { width: 238, height: 158 }
  const spot = { x: 172.5, y: 73.5 }
  const cover = Math.max(400 / 238, 300 / 158)
  const covers = (placed: { pixel: number; left: number; top: number }): boolean =>
    placed.left <= 1e-9 && placed.top <= 1e-9 && placed.left + own.width * placed.pixel >= screen.width - 1e-9 && placed.top + own.height * placed.pixel >= screen.height - 1e-9

  it('is as large as just covers the screen, in its middle, when no one stands on it', () => {
    const placed = placeCave(screen, own, spot)
    expect(placed.pixel).toBeCloseTo(cover)
    expect(covers(placed)).toBe(true)
  })

  it('puts its spot right under the feet, and still covers the screen', () => {
    for (const feet of [
      { x: 290, y: 140 },
      { x: 300, y: 170 },
      { x: 250, y: 100 },
    ]) {
      const placed = placeCave(screen, own, spot, feet)
      expect(placed.left + spot.x * placed.pixel).toBeCloseTo(feet.x)
      expect(placed.top + spot.y * placed.pixel).toBeCloseTo(feet.y)
      expect(covers(placed)).toBe(true)
    }
  })

  it('is enlarged no more than needed: feet where the spot falls when it just covers leave it so', () => {
    const placed = placeCave(screen, own, spot, { x: 400 - (238 - spot.x) * cover, y: spot.y * cover })
    expect(placed.pixel).toBeCloseTo(cover)
  })
})

describe('a ramp of colours', () => {
  it('gives its ends at 0 and 1, and the colour between two of its colours half way', () => {
    expect(onRamp(RAMP, 0)).toEqual([16, 9, 13])
    expect(onRamp(RAMP, 1)).toEqual([148, 108, 107])
    expect(onRamp(RAMP, 0.25)).toEqual([39.5, 26, 32])
  })
})

describe('a colour of the tokens', () => {
  it('is read from its #rrggbb, spaces round it or not', () => {
    expect(rgbOf(' #2b1C25')).toEqual([43, 28, 37])
  })

  it('is nothing when written another way', () => {
    expect(rgbOf('rgb(1 2 3)')).toBeUndefined()
    expect(rgbOf('')).toBeUndefined()
  })
})
