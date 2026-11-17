/**
 * A dead character in the den's light (decision 228): a ghost. It rises out
 * of the den, sways from side to side within the light, wavers and glows;
 * near the top it breaks up by itself, in squares that drift up and go. Its
 * picture is small, on pixels of its own. Pure: what it looks like at a
 * moment is worked out from the time alone, in milliseconds since it came.
 */
export const GHOST = {
  /** One sway to the left, to the right and back, in milliseconds. */
  swayEvery: 2600,
  /** Its rows waver one pixel to either side, in a wave this many rows long that runs down it once in this many milliseconds. */
  waveRows: 14,
  waveEvery: 1100,
  /** Its glow comes and goes once in this many milliseconds, between this share of its strength and the whole of it. */
  glowEvery: 1600,
  glowLeast: 0.5,
  /** The share of its rise it stays whole for; it breaks up over the rest. */
  whole: 0.65,
  /** It breaks up in squares this many pixels a side. */
  square: 2,
  /** Of the breaking up: the share by which every square has let go, and the share a square drifts for before it is gone. */
  letGo: 0.7,
  linger: 0.3,
  /** How many pixels a square drifts up before it is gone. */
  drift: 18,
  /** How often its picture is drawn again, in milliseconds. */
  frame: 50,
} as const

/** How far aside it is, in whole pixels: from `reach` to the left to `reach` to the right. */
export function swayAt(elapsed: number, reach: number): number {
  return Math.round(reach * Math.sin((elapsed / GHOST.swayEvery) * 2 * Math.PI))
}

/** How far aside one of its rows is drawn, the top one being row 0: a pixel to the left, none, or a pixel to the right. */
export function waveAt(row: number, elapsed: number): number {
  return Math.round(Math.sin((row / GHOST.waveRows + elapsed / GHOST.waveEvery) * 2 * Math.PI))
}

/** How strong its glow is, from `glowLeast` to 1. */
export function glowAt(elapsed: number): number {
  const swell = 0.5 + 0.5 * Math.sin((elapsed / GHOST.glowEvery) * 2 * Math.PI)
  return GHOST.glowLeast + (1 - GHOST.glowLeast) * swell
}

/** How far it has broken up, from 0 (whole) to 1 (gone), `elapsed` milliseconds into a rise that lasts `life`. */
export function goneAt(elapsed: number, life: number): number {
  const share = life > 0 ? elapsed / life : 1
  return Math.min(1, Math.max(0, (share - GHOST.whole) / (1 - GHOST.whole)))
}

/** A number from 0 to 1 that is always the same for the same square: when it lets go. */
export function chanceOf(column: number, row: number): number {
  let mixed = (Math.imul(column, 374761393) + Math.imul(row, 668265263)) | 0
  mixed = Math.imul(mixed ^ (mixed >>> 13), 1274126177)
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296
}

/**
 * How many pixels one of its squares has drifted up when the ghost has broken
 * up by `gone`: none while it holds, more and more once it has let go, and
 * nothing at all (`undefined`) once it is gone. `chance` is the square's own
 * number, from 0 to 1: the lower, the sooner it lets go.
 */
export function driftOf(chance: number, gone: number): number | undefined {
  const since = gone - chance * GHOST.letGo
  if (since <= 0) return 0
  if (since >= GHOST.linger) return undefined
  return Math.round((since / GHOST.linger) * GHOST.drift)
}

/**
 * The size of one pixel of a ghost, in CSS pixels: one device pixel less than
 * a pixel of those who walk (half a pixel of the scene), so that it is smaller
 * than they are and stays sharp; never less than one device pixel.
 * `scenePixel` is one pixel of the scene in CSS pixels.
 */
export function ghostPixel(scenePixel: number, ratio: number): number {
  const devicePixelRatio = ratio > 0 ? ratio : 1
  return Math.max(1, Math.floor(Math.round(scenePixel * devicePixelRatio) / 2) - 1) / devicePixelRatio
}
