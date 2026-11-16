import { describe, expect, it } from 'vitest'
import { blockCentres, fitScene } from './scene-fit'

const MEADOW = { width: 238, height: 158 }

describe('fitting the title scene to a screen', () => {
  // Phones 320 to 480 CSS pixels wide (the app is never wider), at the pixel ratios phones have.
  const screens = [320, 360, 390, 412, 480].flatMap((width) => [1, 2, 2.625, 3].map((ratio) => ({ width, ratio })))

  it.each(screens.flatMap((screen) => [20, 72, 119, 200].map((focus) => ({ ...screen, focus }))))('covers a $width px screen at ratio $ratio around column $focus with whole device pixels', ({ width, ratio, focus }) => {
    const fit = fitScene(MEADOW, width, ratio, focus)
    const height = (width * 3) / 4
    expect(Number.isInteger(Math.round(fit.pixel * ratio * 1e9) / 1e9)).toBe(true)
    expect(Number.isInteger(Math.round(fit.left * ratio * 1e9) / 1e9)).toBe(true)
    expect(fit.left).toBeLessThanOrEqual(0)
    expect(fit.top).toBeLessThanOrEqual(0)
    expect(fit.left + MEADOW.width * fit.pixel).toBeGreaterThanOrEqual(width - 1 / ratio)
    // It stands on the screen's bottom edge, to the nearest device pixel.
    expect(Math.abs(fit.top + MEADOW.height * fit.pixel - height)).toBeLessThanOrEqual(0.5 / ratio + 1e-9)
  })

  it('uses the smallest pixel that covers the height', () => {
    // 320 px at ratio 2: the screen is 480 device pixels tall, 158 rows need 4 device pixels each.
    const fit = fitScene(MEADOW, 320, 2)
    expect(fit.pixel).toBe(2)
    // One device pixel less would leave a gap: 3 × 158 = 474.
    expect((fit.pixel * 2 - 1) * MEADOW.height).toBeLessThan(480)
  })

  it('says which part of the scene the screen shows', () => {
    // 316 CSS pixels of scene for a screen 240 tall: 76 are cut off at the top, 38 rows.
    const fit = fitScene(MEADOW, 320, 2)
    expect(fit.visible).toEqual({ left: 39, top: 38, right: 199, bottom: 158 })
  })

  it('keeps its focus in the middle of the screen', () => {
    const fit = fitScene(MEADOW, 320, 2, 119)
    expect(fit.left + 119 * fit.pixel).toBe(160)
  })

  it('stops at its edges rather than show past them', () => {
    // The den stands near the meadow's left edge: the screen goes as far left as the meadow does, and no further.
    expect(fitScene(MEADOW, 412, 2.625, 20).left).toBe(0)
    const right = fitScene(MEADOW, 412, 2.625, 230)
    expect(right.left + MEADOW.width * right.pixel).toBeGreaterThanOrEqual(412)
    expect(right.left + MEADOW.width * right.pixel).toBeLessThan(412 + 1 / 2.625)
    expect(right.visible.right).toBe(MEADOW.width)
  })

  it('treats an unknown pixel ratio as 1', () => {
    expect(fitScene(MEADOW, 320, 0)).toEqual(fitScene(MEADOW, 320, 1))
    expect(fitScene(MEADOW, 320, Number.NaN)).toEqual(fitScene(MEADOW, 320, 1))
  })
})

describe('taking an enlarged picture back to its own pixels', () => {
  it('reads the middle of each block', () => {
    expect(blockCentres(6, 2)).toEqual([1, 4])
    expect(blockCentres(9, 3)).toEqual([1, 4, 7])
  })

  it('reads every pixel of a picture that is not enlarged', () => {
    expect(blockCentres(5, 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('reads one pixel per block, in order, inside the picture, at an uneven enlargement', () => {
    const centres = blockCentres(753, 238)
    expect(centres).toHaveLength(238)
    expect(centres.every((value, index) => index === 0 || value > (centres[index - 1] ?? -1))).toBe(true)
    expect(Math.max(...centres)).toBeLessThan(753)
  })
})
