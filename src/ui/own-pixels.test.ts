import { describe, expect, it } from 'vitest'
import { ownPixels } from './own-pixels'

/** A picture of `width` by `height` whose every pixel is the colour `at` gives its place. */
function picture(width: number, height: number, at: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set([...at(x, y), 255], (y * width + x) * 4)
  return { data, width, height }
}

describe('taking an enlarged picture back to its own pixels', () => {
  it('gives each pixel the colour of its block', () => {
    // Two pixels by two, each enlarged to a block of three by three.
    const served = picture(6, 6, (x, y) => [x < 3 ? 10 : 20, y < 3 ? 30 : 40, 0])
    expect([...ownPixels(served, { width: 2, height: 2 })]).toEqual([10, 30, 0, 255, 20, 30, 0, 255, 10, 40, 0, 255, 20, 40, 0, 255])
  })

  it('reads the middle of a block, not its edge, at an uneven enlargement', () => {
    // Three pixels across, enlarged to ten: blocks of three or four columns, the first and last columns a stray shade.
    const served = picture(10, 1, (x) => [x === 0 || x === 9 ? 99 : x < 3 ? 1 : x < 7 ? 2 : 3, 0, 0])
    const own = ownPixels(served, { width: 3, height: 1 })
    expect([own[0], own[4], own[8]]).toEqual([1, 2, 3])
  })
})
