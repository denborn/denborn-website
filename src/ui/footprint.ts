/**
 * Where a Pokémon's feet are on its sprite (decision 254): the shadow under
 * it is as wide as they are, and in their middle, not as wide as the
 * picture, whose empty sides vary from one Pokémon to the next. Pure: it
 * reads the opacity it is given.
 */
export const FOOTPRINT = {
  /** Its feet: the lowest rows it is drawn on, this share of its height, never fewer than 2. */
  share: 0.2,
  /** A shadow is this much wider than the feet, as a share of their width, and as high as this share of its own width. */
  wider: 0.15,
  flat: 0.25,
} as const

/** The columns its feet span, the right one past their last: in the sprite's own pixels. */
export interface Footprint {
  left: number
  right: number
}

/**
 * The span of the feet of a sprite `width` by `height`, given the opacity
 * of each of its pixels (0 for a pixel not drawn): the columns drawn on in
 * its lowest rows. Nothing for a sprite with nothing drawn.
 */
export function footprintOf(opacity: (x: number, y: number) => number, width: number, height: number): Footprint | undefined {
  let top = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (opacity(x, y) === 0) continue
      if (top < 0) top = y
      bottom = y
      break
    }
  }
  if (bottom < 0) return undefined
  const rows = Math.max(2, Math.round((bottom - top + 1) * FOOTPRINT.share))
  let left = width
  let right = 0
  for (let y = Math.max(top, bottom - rows + 1); y <= bottom; y++) {
    for (let x = 0; x < width; x++) {
      if (opacity(x, y) === 0) continue
      left = Math.min(left, x)
      right = Math.max(right, x + 1)
    }
  }
  return { left, right }
}

/**
 * The shadow of a sprite `width` pixels wide whose feet are `feet`, in the
 * sprite's own pixels: its width and height, and how far its middle is from
 * the middle of the picture (to the right when positive), mirrored with it.
 */
export function shadowOf(feet: Footprint, width: number, mirrored: boolean): { width: number; height: number; offset: number } {
  const span = (feet.right - feet.left) * (1 + FOOTPRINT.wider)
  const offset = (feet.left + feet.right) / 2 - width / 2
  return { width: span, height: Math.max(2, span * FOOTPRINT.flat), offset: mirrored ? -offset : offset }
}

/**
 * How far to move a sprite `width` pixels wide, in its own pixels and to the
 * right when positive, so that the middle of its feet, not of its picture, is
 * where it stands (decision 257): Mewtwo's tail no longer pushes it aside.
 */
export function centreShift(feet: Footprint, width: number, mirrored: boolean): number {
  const shift = width / 2 - (feet.left + feet.right) / 2
  return mirrored ? -shift : shift
}
