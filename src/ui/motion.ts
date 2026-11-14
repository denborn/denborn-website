/**
 * The motion vocabulary's numbers, for animations driven from script (Motion).
 * They are the same values as the tokens of tokens.css, which CSS transitions
 * use; a test keeps the two in step. Durations are in seconds here.
 */
export const DURATION = {
  /** A button going down. */
  press: 0.09,
  /** A selection moving, a badge appearing. */
  quick: 0.16,
  /** A panel or a Pokémon sliding in. */
  move: 0.28,
  /** A screen wipe, a Pokémon going down. */
  slow: 0.48,
} as const

type Bezier = readonly [number, number, number, number]

export const EASE = {
  out: [0.2, 0.8, 0.2, 1],
  in: [0.6, 0, 0.9, 0.4],
  /** A small overshoot, for arrivals. */
  snap: [0.3, 1.4, 0.5, 1],
} as const satisfies Record<string, Bezier>

/** Holds each keyframe until the next one: the hard blink of the games, not a fade. */
export const HOLD = (progress: number): number => (progress < 1 ? 0 : 1)
