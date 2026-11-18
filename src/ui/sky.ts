/**
 * How an hour of the day lights a fight's background (decision 275): a veil
 * of one colour laid over the picture, more or less of it. Denborn's own: the
 * backdrops come lit one way, as by day.
 */

/** The veils: the pink of dawn, the orange of dusk, the blue of night. */
export type SkyVeil = 'dawn' | 'dusk' | 'night'

export interface Sky {
  /** The veil over the picture; none by day. */
  veil: SkyVeil | undefined
  /** How much of it shows, from 0 to 1. */
  strength: number
}

const DAY: Sky = { veil: undefined, strength: 0 }

/** The hours that are not plain day, each with its light: the night gives way to dawn at 6, and dusk to the night at 20. */
const LIGHT: Readonly<Record<number, Sky>> = {
  0: { veil: 'night', strength: 1 },
  1: { veil: 'night', strength: 1 },
  2: { veil: 'night', strength: 1 },
  3: { veil: 'night', strength: 1 },
  4: { veil: 'night', strength: 0.9 },
  5: { veil: 'night', strength: 0.6 },
  6: { veil: 'dawn', strength: 0.9 },
  7: { veil: 'dawn', strength: 0.45 },
  17: { veil: 'dusk', strength: 0.4 },
  18: { veil: 'dusk', strength: 0.75 },
  19: { veil: 'dusk', strength: 1 },
  20: { veil: 'night', strength: 0.55 },
  21: { veil: 'night', strength: 0.85 },
  22: { veil: 'night', strength: 1 },
  23: { veil: 'night', strength: 1 },
}

/** The light at an hour of the day, from 0 to 23; an hour past the day's end is counted round, and anything that is no hour is the day. */
export function skyAt(hour: number): Sky {
  if (!Number.isFinite(hour)) return DAY
  return LIGHT[((Math.floor(hour) % 24) + 24) % 24] ?? DAY
}
