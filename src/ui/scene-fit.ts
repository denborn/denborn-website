/**
 * The title screen's scene is pixel art of its own size (Showdown's meadow,
 * 238 × 158), not the DS's 256 × 192. It fills the 4:3 screen: each of its
 * pixels is a whole number of device pixels, enough for its rows to cover the
 * screen's height; it stands on the screen's bottom edge, with one of its
 * columns (its focus, the den's) kept in the screen's middle as far as its
 * edges allow, and the screen cuts what is left over at its sides and top.
 */
export interface SceneGrid {
  width: number
  height: number
}

/** A rectangle of the scene's own pixels: from `left` and `top`, up to but not including `right` and `bottom`. */
export interface SceneArea {
  left: number
  top: number
  right: number
  bottom: number
}

export interface SceneFit {
  /** One pixel of the scene, in CSS pixels. */
  pixel: number
  /** Where the scene's left and top edges fall from the screen's, in CSS pixels: zero or less. */
  left: number
  top: number
  /** The part of the scene the screen shows. */
  visible: SceneArea
}

/**
 * Fits the scene to a 4:3 screen `screenWidth` CSS pixels wide, on a device
 * with `ratio` device pixels to a CSS pixel, its column `focus` in the middle
 * if the scene reaches far enough on either side.
 */
export function fitScene(grid: SceneGrid, screenWidth: number, ratio: number, focus = grid.width / 2): SceneFit {
  const devicePixelRatio = ratio > 0 ? ratio : 1
  const screenHeight = (screenWidth * 3) / 4
  const pixel = Math.max(1, Math.ceil((screenHeight * devicePixelRatio) / grid.height)) / devicePixelRatio
  // Snapped to device pixels, so that every pixel of the scene starts on one.
  const snap = (value: number) => Math.round(value * devicePixelRatio) / devicePixelRatio
  // As far left as the scene may go and still cover the screen's right edge: rounded towards covering.
  const leftmost = Math.ceil((screenWidth - grid.width * pixel) * devicePixelRatio) / devicePixelRatio
  const left = Math.min(0, Math.max(leftmost, snap(screenWidth / 2 - focus * pixel)))
  const top = Math.min(0, snap(screenHeight - grid.height * pixel))
  const visible = {
    left: Math.max(0, Math.floor(-left / pixel)),
    top: Math.max(0, Math.floor(-top / pixel)),
    right: Math.min(grid.width, Math.ceil((screenWidth - left) / pixel)),
    bottom: grid.height,
  }
  return { pixel, left, top, visible }
}

/**
 * For a picture enlarged by nearest neighbour from `grid` pixels to `source`
 * pixels, the source pixel at the centre of each grid pixel's block: reading
 * those gets the picture back on its own pixels.
 */
export function blockCentres(source: number, grid: number): number[] {
  return Array.from({ length: grid }, (_, index) => Math.min(source - 1, Math.floor(((index + 0.5) * source) / grid)))
}
