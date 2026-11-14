/**
 * Pixel art stays sharp only when each of its pixels covers a whole number of
 * the device's pixels. Given the size wanted for one sprite pixel, in DS
 * pixels, this returns the nearest size in CSS pixels that does so.
 */
export function snapScale(dsScale: number, unit: number, devicePixelRatio: number): number {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.max(1, Math.round(dsScale * unit * ratio)) / ratio
}
