/**
 * Pixel art stays sharp only when each of its pixels covers a whole number of
 * the device's pixels. Given the size wanted for one sprite pixel, in DS
 * pixels, this returns the nearest size in CSS pixels that does so.
 */
/**
 * The size of one pixel of a drawing `width` pixels wide, so that it is drawn
 * at `scale` unless that would make it wider than `widest`: then it is drawn
 * as wide as `widest`, its proportions kept. `scale` and `widest` are in one
 * and the same unit.
 */
export function fitScale(scale: number, width: number, widest: number): number {
  return Math.min(scale, widest / width)
}

export function snapScale(dsScale: number, unit: number, devicePixelRatio: number): number {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1, Math.round(dsScale * unit * ratio)) / ratio
}
