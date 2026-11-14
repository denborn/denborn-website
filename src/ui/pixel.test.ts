import { describe, expect, it } from 'vitest'
import { snapScale } from './pixel'

describe('sprite scale', () => {
  it('keeps the size asked for when it already falls on whole device pixels', () => {
    expect(snapScale(1, 2, 1)).toBe(2)
    expect(snapScale(2, 1.5, 2)).toBe(3)
  })

  it('moves to the nearest whole number of device pixels otherwise', () => {
    // A phone 393 px wide with 3 device pixels per CSS pixel: 4.6 device pixels wanted, 5 given.
    expect(snapScale(1, 393 / 256, 3) * 3).toBe(5)
    // The same screen at 2.625 device pixels per CSS pixel (many Android phones).
    expect(snapScale(1, 412 / 256, 2.625) * 2.625).toBe(4)
  })

  it('never goes below one device pixel', () => {
    expect(snapScale(0.1, 1, 2)).toBe(0.5)
  })

  it('treats an unknown pixel ratio as 1', () => {
    expect(snapScale(1, 2.4, 0)).toBe(2)
    expect(snapScale(1, 2.4, Number.NaN)).toBe(2)
  })
})
