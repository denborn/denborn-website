/**
 * The inside of the den (decisions 244 and 253): one of Showdown's caves,
 * taken back to its own pixels and coloured as the den's own rocks are at
 * night. Each pixel's lightness is put on a ramp of the rocks' colours, from
 * a black maroon to their lit side, never as far as the lightest; further
 * from where the light falls it is darker, in a few steps dithered as the
 * games dither, so that it stays pixel art. Nothing is lit, nothing pink.
 * Pure: it works on the pixels and the colours it is given.
 */
import { blockCentres } from './scene-fit'

export const CAVE = {
  /** How far up the ramp the lightest of the cave goes: under 1, the den's lit side is never reached. */
  top: 0.8,
  /** How far the light reaches from where it falls (the spot), as a share of the diagonal; and the share of that reach lit whole. */
  reach: 0.75,
  lit: 0.3,
  /** In how many steps it darkens away from the light, and how much darker the darkest step is. */
  steps: 3,
  strength: 0.45,
} as const

/** The order in which the pixels of a 4 × 4 square take the next step: the games' ordered dithering. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const

/** Pixels as a canvas holds them: four numbers a pixel, red, green, blue and opacity, row after row. */
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** A point, or a size, in some unit the caller says. */
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** A colour as three numbers from 0 to 255. */
export type Rgb = readonly [number, number, number]

/** A colour written as CSS writes it in the tokens, `#rrggbb`; nothing when it is written otherwise. */
export function rgbOf(written: string): Rgb | undefined {
  const found = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(written.trim())
  if (!found) return undefined
  const [, red = '0', green = '0', blue = '0'] = found
  return [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)]
}

/** How light a colour looks, from 0 to 255. */
const lightness = (red: number, green: number, blue: number): number => 0.2126 * red + 0.7152 * green + 0.0722 * blue

/** The colour `share` of the way up `ramp` (0 its first colour, 1 its last), between its two nearest colours. */
export function onRamp(ramp: readonly Rgb[], share: number): Rgb {
  const at = Math.min(1, Math.max(0, share)) * (ramp.length - 1)
  const below = Math.min(ramp.length - 2, Math.floor(at))
  const from: Rgb = ramp[below] ?? [0, 0, 0]
  const to: Rgb = ramp[below + 1] ?? from
  const part = at - below
  const mix = (channel: 0 | 1 | 2): number => from[channel] + (to[channel] - from[channel]) * part
  return [mix(0), mix(1), mix(2)]
}

/**
 * A picture served enlarged from `own` pixels wide and high, on its own
 * pixels, as the inside of the den looks: its lightness on `ramp`, the
 * darkest of the picture at the ramp's first colour, lit at `light` (in its
 * own pixels) and darker away from it.
 */
export function caveInside(served: Pixels, own: Size, ramp: readonly Rgb[], light: Point): Pixels {
  const crop = { x: 0, y: 0, width: own.width, height: own.height }
  const columns = blockCentres(served.width, own.width)
  const rows = blockCentres(served.height, own.height)
  const at = (x: number, y: number): number => ((rows[y] ?? 0) * served.width + (columns[x] ?? 0)) * 4
  const lightnessAt = (x: number, y: number): number => {
    const from = at(x, y)
    return lightness(served.data[from] ?? 0, served.data[from + 1] ?? 0, served.data[from + 2] ?? 0)
  }
  // The picture's own darkest and lightest, over the part shown, so that its whole range is put on the ramp.
  let darkest = 255
  let lightest = 0
  for (let y = crop.y; y < crop.y + crop.height; y++) {
    for (let x = crop.x; x < crop.x + crop.width; x++) {
      const seen = lightnessAt(x, y)
      darkest = Math.min(darkest, seen)
      lightest = Math.max(lightest, seen)
    }
  }
  const range = Math.max(1, lightest - darkest)
  const data = new Uint8ClampedArray(crop.width * crop.height * 4)
  for (let y = 0; y < crop.height; y++) {
    for (let x = 0; x < crop.width; x++) {
      const colour = onRamp(ramp, ((lightnessAt(crop.x + x, crop.y + y) - darkest) / range) * CAVE.top)
      const shade = shadeAt(x, y, crop.width, crop.height, light)
      const to = (y * crop.width + x) * 4
      data.set([Math.round(colour[0] * shade), Math.round(colour[1] * shade), Math.round(colour[2] * shade), 255], to)
    }
  }
  return { data, width: crop.width, height: crop.height }
}

/** How much of its colour a pixel keeps where it stands, from 1 where the light falls (`light`, in pixels) to `1 - strength` at its darkest. */
export function shadeAt(x: number, y: number, width: number, height: number, light: Point): number {
  const away = Math.hypot((x + 0.5 - light.x) / width, (y + 0.5 - light.y) / height) / CAVE.reach
  const far = Math.min(1, Math.max(0, (away - CAVE.lit) / (1 - CAVE.lit))) * CAVE.steps
  // A pixel takes the next step once the way to it is past its place in the 4 × 4 order, each place the middle of a sixteenth.
  const step = Math.floor(far) + ((far % 1) * 16 > (BAYER[y % 4]?.[x % 4] ?? 0) + 0.5 ? 1 : 0)
  return 1 - (CAVE.strength * Math.min(step, CAVE.steps)) / CAVE.steps
}

/** Where the cave is drawn on its screen: one of its pixels, and its top left corner, in CSS pixels from the screen's. */
export interface Placement {
  pixel: number
  left: number
  top: number
}

/**
 * Where to draw a cave `own` pixels wide and high on a screen `screen` CSS
 * pixels wide and high so that it covers the whole screen and, when `feet`
 * is given (where the one shown stands, in CSS pixels from the screen's top
 * left), its spot (decision 257: the oval its own artist drew for a Pokémon
 * to stand on, in its own pixels) is right under them. It is enlarged no
 * more than that needs (about a fifth on a phone): without feet, it just
 * covers the screen, in its middle.
 */
export function placeCave(screen: Size, own: Size, spot: Point, feet?: Point): Placement {
  const cover = Math.max(screen.width / own.width, screen.height / own.height)
  if (!feet) return { pixel: cover, left: (screen.width - own.width * cover) / 2, top: (screen.height - own.height * cover) / 2 }
  // Each edge of the cave must be at or beyond the screen's own while the spot stays under the feet.
  const pixel = Math.max(cover, feet.x / spot.x, (screen.width - feet.x) / (own.width - spot.x), feet.y / spot.y, (screen.height - feet.y) / (own.height - spot.y))
  return { pixel, left: feet.x - spot.x * pixel, top: feet.y - spot.y * pixel }
}
