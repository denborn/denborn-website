/**
 * The title screen's storm (decision 207): red lightning strikes at uneven
 * gaps, so that it never feels like a loop, and each bolt is a new shape. Pure:
 * the chance comes in as `random`, a function returning a number in [0, 1).
 */
import type { SceneArea } from './scene-fit'

/** Never more than three flashes in any second (DESIGN.md, "no more than three blinks a second"). */
export const STORM = {
  /** The shortest and longest wait between two strikes, in milliseconds. */
  gap: [2000, 5000],
  /** How often a strike comes twice, the second close behind the first. */
  doubleChance: 0.25,
  /** How far behind the first the second comes, in milliseconds. */
  doubleGap: [150, 250],
  /** How often a strike falls on the den, down its light, as the first one does. */
  denChance: 1 / 3,
} as const

export interface Strike {
  /** Milliseconds to wait from the previous strike. */
  wait: number
  /** When it comes twice: milliseconds from the first flash to the second. */
  again?: number
  /** It falls on the den rather than somewhere in the sky. */
  onDen: boolean
}

function between(random: () => number, [low, high]: readonly [number, number]): number {
  return Math.round(low + random() * (high - low))
}

/** The next strike: how long until it comes, whether a second one follows it, and where it falls. */
export function nextStrike(random: () => number): Strike {
  const wait = between(random, STORM.gap)
  const onDen = random() < STORM.denChance
  return random() < STORM.doubleChance ? { wait, again: between(random, STORM.doubleGap), onDen } : { wait, onDen }
}

export interface BoltPoint {
  x: number
  y: number
}

/** How far down the sky a bolt reaches, as a share of the rows the screen shows. */
const REACH = [0.3, 0.55] as const
/** How long a fork runs, in rows. */
const FORK = [5, 12] as const

/** A path down from `start`, one row at a time, each row at most one pixel aside from the one above and within `columns`. */
function descend(random: () => number, start: BoltPoint, rows: number, columns: Pick<SceneArea, 'left' | 'right'>, lean: number): BoltPoint[] {
  const points: BoltPoint[] = []
  let { x } = start
  let direction = lean
  for (let row = 1; row <= rows; row++) {
    // A bolt runs straight for a few rows, then breaks the other way: its zigzag.
    if (random() < 0.3) direction = random() < 0.5 ? -1 : 1
    const step = random() < 0.25 ? 0 : direction
    // Room for the bolt's width: its core is two pixels, with an edge on either side.
    x = Math.min(columns.right - 3, Math.max(columns.left + 1, x + step))
    points.push({ x, y: start.y + row })
  }
  return points
}

/**
 * A bolt: from the top of what the screen shows, down into the sky, on one
 * side of the light (`clear`, the columns it stands in), and with one fork now
 * and then. Every point is in the visible sky and outside the light, with room
 * on its left for one pixel and on its right for two (the bolt's width), and each
 * is one row below a point of the bolt at most one column aside.
 */
export function boltPath(random: () => number, sky: SceneArea, clear: Pick<SceneArea, 'left' | 'right'>): BoltPoint[] {
  const height = sky.bottom - sky.top
  const rows = Math.max(1, Math.min(height - 1, Math.round(height * (REACH[0] + random() * (REACH[1] - REACH[0])))))
  const sides = [
    { left: sky.left, right: Math.min(sky.right, clear.left) },
    { left: Math.max(sky.left, clear.right), right: sky.right },
  ].filter((side) => side.right - side.left >= 8)
  const columns = sides[Math.floor(random() * sides.length)] ?? { left: sky.left, right: sky.right }
  // It starts away from the side's edges, so that it has room to wander.
  const start = { x: Math.floor(columns.left + 2 + random() * (columns.right - columns.left - 5)), y: sky.top }
  const trunk = [start, ...descend(random, start, rows, columns, random() < 0.5 ? -1 : 1)]
  if (random() < 0.5) return trunk
  const from = trunk[Math.floor(trunk.length / 3 + random() * (trunk.length / 3))] ?? start
  const forkRows = Math.min(start.y + rows - from.y, Math.round(FORK[0] + random() * (FORK[1] - FORK[0])))
  return [...trunk, ...descend(random, from, forkRows, columns, from.x < (columns.left + columns.right) / 2 ? -1 : 1)]
}

/** How far to either side of its target a bolt that falls on the den may start, in pixels. */
const ONTO_SPREAD = 18

/**
 * A bolt that falls on a point: from the top of what the screen shows, a little
 * to one side, zigzagging down to `target` and ending on it. Each point is one
 * row below the one before, at most one column aside, with room for the bolt's
 * width inside the sky.
 */
export function boltOnto(random: () => number, sky: SceneArea, target: BoltPoint): BoltPoint[] {
  const columns = { left: sky.left + 1, right: sky.right - 3 }
  const end = { x: Math.min(columns.right, Math.max(columns.left, target.x)), y: Math.max(sky.top, target.y) }
  const startX = Math.min(columns.right, Math.max(columns.left, Math.round(end.x + (random() * 2 - 1) * ONTO_SPREAD)))
  const points: BoltPoint[] = [{ x: startX, y: sky.top }]
  let x = startX
  let direction = random() < 0.5 ? -1 : 1
  for (let y = sky.top + 1; y <= end.y; y++) {
    const rowsLeft = end.y - y
    const away = end.x - x
    if (Math.abs(away) > rowsLeft) {
      // No more room to wander: straight for the target.
      x += Math.sign(away)
    } else {
      if (random() < 0.3) direction = random() < 0.5 ? -1 : 1
      const step = random() < 0.25 ? 0 : direction
      // A step that would leave too few rows to come back is not taken.
      if (Math.abs(end.x - (x + step)) <= rowsLeft) x = Math.min(columns.right, Math.max(columns.left, x + step))
    }
    points.push({ x, y })
  }
  return points
}
