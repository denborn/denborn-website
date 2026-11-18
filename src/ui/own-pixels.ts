/**
 * Showdown's backdrops are pixel art served enlarged by a little over three:
 * a browser's own scaling would pick their pixels unevenly. Here a picture
 * is taken back to its own pixels, by reading the centre of each of its
 * blocks, to be drawn once on a canvas of its own size.
 */
import { type SceneGrid, blockCentres } from './scene-fit'

/** A picture as a canvas gives it: RGBA, four bytes a pixel, row after row. */
export interface PictureData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** The picture `served`, enlarged from `own` pixels, back on those pixels. */
export function ownPixels(served: PictureData, own: SceneGrid): Uint8ClampedArray {
  const out = new Uint8ClampedArray(own.width * own.height * 4)
  const columns = blockCentres(served.width, own.width)
  blockCentres(served.height, own.height).forEach((row, y) => {
    columns.forEach((column, x) => {
      const from = (row * served.width + column) * 4
      out.set(served.data.subarray(from, from + 4), (y * own.width + x) * 4)
    })
  })
  return out
}

/**
 * Draws `image`, once it has loaded, on `canvas` as its own pixels: the
 * canvas must be `own` pixels in size. Says whether it could: a browser may
 * give no surface to draw on.
 */
export function drawOwnPixels(canvas: HTMLCanvasElement, image: HTMLImageElement, own: SceneGrid): boolean {
  const target = canvas.getContext('2d')
  const scratch = document.createElement('canvas')
  scratch.width = image.naturalWidth
  scratch.height = image.naturalHeight
  const source = scratch.getContext('2d', { willReadFrequently: true })
  if (!target || !source) return false
  source.drawImage(image, 0, 0)
  const drawn = target.createImageData(own.width, own.height)
  drawn.data.set(ownPixels(source.getImageData(0, 0, scratch.width, scratch.height), own))
  target.putImageData(drawn, 0, 0)
  return true
}
