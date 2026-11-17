/**
 * The Pokémon shown large on the list of characters (decision 241): it stands
 * on its shadow and is alive, now and then hopping, turning round, looking one
 * way and the other, spinning; another one shown, it leaves by the side and
 * the next comes in from the other. Pure: what it does is chosen from the
 * random numbers given, so that a test can play it. Denborn's own: the games'
 * summary screen only plays a Pokémon's cry and its animation.
 */
export const SHOWCASE = {
  /** The first act, this long after it has come in, in milliseconds. */
  first: 500,
  /** A rest between two acts: from this many milliseconds to this many. */
  rest: [600, 2200] as const,
  /** One hop, up and down, and how high it goes, in its own pixels. */
  hop: 260,
  hopHeight: 4,
  /** The gap between the two hops of a double hop. */
  hopGap: 40,
  /** Seen from behind, then facing again. */
  turn: 700,
  /** Facing the other way, then back. */
  look: 800,
  /** Each quarter of a spin. */
  spin: 80,
  /** Each look aside of a glance, left and right. */
  glance: 250,
  /** A change of Pokémon: one leaving, one coming, in milliseconds. A ghost breaking up takes longer. */
  leave: 280,
  come: 340,
  ghostLeave: 480,
  /** A ghost sways this many of its pixels to either side. */
  ghostReach: 3,
  /** How many leaving at once, at most: past that, the oldest is taken away at once. */
  leaving: 3,
  /** A slide of the Pokémon (decision 258): it starts once a press has moved this many DS pixels, more across than up or down. */
  slideStarts: 4,
  /** Let go this many DS pixels away or more, it goes to the next one; nearer, it springs back. */
  swipe: 24,
  /** A press on the strip that moves this many DS pixels is a drag, not a press. */
  drag: 6,
} as const

/** Where it looks: the front sprites look left, the back ones right; mirrored, each looks the other way. */
export interface Pose {
  view: 'front' | 'back'
  mirrored: boolean
  /** How high it is off the ground, in its own pixels. */
  lift: number
}

/** Standing on its shadow, facing whoever looks. */
export const AT_REST: Pose = { view: 'front', mirrored: false, lift: 0 }

/** One moment of an act: from `after` milliseconds into it, it is posed so. */
export interface Frame extends Pose {
  after: number
}

export const ACTS = ['hop', 'hops', 'turn', 'look', 'spin', 'glance'] as const
export type Act = (typeof ACTS)[number]

/** A hop from `at` milliseconds, in its pixels: up by halves, then down, a pixel row at a time as a sprite moves in the games. */
function hopFrom(at: number, pose: Omit<Pose, 'lift'>): Frame[] {
  const step = SHOWCASE.hop / 4
  const half = SHOWCASE.hopHeight / 2
  return [half, SHOWCASE.hopHeight, half, 0].map((lift, nth) => ({ ...pose, lift, after: at + nth * step }))
}

const FRONT = { view: 'front', mirrored: false } as const
const FRONT_OTHER_WAY = { view: 'front', mirrored: true } as const
const BACK = { view: 'back', mirrored: false } as const
const BACK_OTHER_WAY = { view: 'back', mirrored: true } as const

/** What an act is, moment by moment. Each ends standing at rest. */
export function framesOf(act: Act): readonly Frame[] {
  switch (act) {
    case 'hop':
      return hopFrom(0, FRONT)
    case 'hops':
      return [...hopFrom(0, FRONT), ...hopFrom(SHOWCASE.hop + SHOWCASE.hopGap, FRONT)]
    case 'turn':
      return [
        { ...BACK, lift: 0, after: 0 },
        { ...AT_REST, after: SHOWCASE.turn },
      ]
    case 'look':
      return [{ ...FRONT_OTHER_WAY, lift: 0, after: 0 }, ...hopFrom(SHOWCASE.look / 2, FRONT_OTHER_WAY), { ...AT_REST, after: SHOWCASE.look }]
    case 'spin': {
      const turned = [FRONT_OTHER_WAY, BACK, BACK_OTHER_WAY].map((pose, nth) => ({ ...pose, lift: 0, after: nth * SHOWCASE.spin }))
      return [...turned, ...hopFrom(3 * SHOWCASE.spin, FRONT)]
    }
    case 'glance':
      return [FRONT_OTHER_WAY, FRONT, FRONT_OTHER_WAY, FRONT].map((pose, nth) => ({ ...pose, lift: 0, after: nth * SHOWCASE.glance }))
  }
}

/** The next act: any but the last one, so that it never does the same thing twice in a row. */
export function nextAct(random: () => number, last: Act | undefined): Act {
  const choices = ACTS.filter((act) => act !== last)
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] ?? 'hop'
}

/** How long it rests before its next act, in milliseconds. */
export function restOf(random: () => number): number {
  const [least, most] = SHOWCASE.rest
  return least + Math.round(random() * (most - least))
}

/**
 * How one leaves and comes: a ghost (a dead character) breaks up and floats
 * in; one that flies flies off and swoops in; the others hop off by the side
 * and hop in from the other.
 */
export type Passage = 'ghost' | 'fly' | 'hop'

export function passageOf(dead: boolean, types: readonly string[]): Passage {
  if (dead) return 'ghost'
  return types.includes('Flying') ? 'fly' : 'hop'
}

/** The type whose ground it stands on (decision 242): its first type; a dead one stands on the Ghost type's, as a ghost. */
export function groundTypeOf(dead: boolean, types: readonly string[]): string | undefined {
  return dead ? 'Ghost' : types[0]
}

/**
 * What a press on the Pokémon that moved `across` and `down` DS pixels does
 * once let go (decision 258): -1 shows the one before (it was slid to the
 * right), 1 the next (slid to the left, as a page is turned), 0 nothing, as
 * when it moved too little, or more up and down than across.
 */
export function slidTo(across: number, down: number): -1 | 0 | 1 {
  if (Math.abs(across) < SHOWCASE.swipe || Math.abs(across) <= Math.abs(down)) return 0
  return across < 0 ? 1 : -1
}

/** Whether a press that moved `across` and `down` DS pixels has become a slide: the Pokémon follows it from then on. */
export function isSliding(across: number, down: number): boolean {
  return Math.abs(across) >= SHOWCASE.slideStarts && Math.abs(across) > Math.abs(down)
}

/** The one `by` places on from `index`, going round: after the last comes the first, before the first the last. */
export function stepTo(index: number, by: number, count: number): number {
  if (count <= 0) return 0
  return (((index + by) % count) + count) % count
}

/**
 * The side the next one comes in from, picked in the strip: from the right
 * (1) when it is further along the strip, from the left (-1) when it is
 * before. The one leaving goes out by the other side.
 */
export function directionOf(from: number, to: number): 1 | -1 {
  return to < from ? -1 : 1
}

interface Size {
  width: number
  height: number
}

/**
 * The size of one of the sprite's pixels, in CSS pixels: as large as a DS
 * pixel, on whole device pixels, or smaller by whole device pixels while it
 * does not fit in `room` (CSS pixels); never less than one device pixel.
 */
export function showcasePixel(sprite: Size, room: Size, unit: number, ratio: number): number {
  const devicePixelRatio = ratio > 0 ? ratio : 1
  let device = Math.max(1, Math.round(unit * devicePixelRatio))
  const fits = (pixels: number): boolean => sprite.width * pixels <= room.width * devicePixelRatio && sprite.height * pixels <= room.height * devicePixelRatio
  while (device > 1 && !fits(device)) device--
  return device / devicePixelRatio
}
