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

/**
 * The title screen's timings (decision 205), in seconds: each step of its
 * intro, one flash of lightning, the blink of TOUCH TO START, the light's
 * frames and the rain. Apart from DURATION, the interface's own moves.
 */
export const TITLE = {
  /** The den in daylight, before its light rises: short, as the owner asked (decision 211). */
  day: 0.8,
  /** The light rising out of the den. */
  rise: 1,
  /** The first strike, while the plain turns dark. */
  darken: 0.8,
  /** The name appearing. */
  name: 0.6,
  /** One red flash. */
  flash: 0.32,
  /** TOUCH TO START, on then off. */
  blink: 1.2,
  /** The light's eight frames. */
  'light-loop': 0.96,
  /** The near rain falling one tile. */
  'rain-fall': 0.6,
  /** A dead character's ghost, from the den's base to where it has broken up and gone (decision 228). */
  ghost: 6,
} as const

/**
 * A screen's change (decision 218), in seconds: the gap between two pieces as
 * they come in, the shorter one as they go out, and the gap between two
 * stripes of a wipe. The moves themselves last `move` (coming) and `quick`
 * (going, and a stripe).
 */
export const SCREEN = {
  piece: 0.03,
  pieceOut: 0.01,
  stripe: 0.012,
} as const

/** The Pokédex's grid sliding by one square (decision 287), in seconds. */
export const DEX = {
  drift: 1.6,
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
