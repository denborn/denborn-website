/**
 * The characters on the plain (decision 225): they come in from a bottom
 * corner of the screen, walk round the den from one spot to another and rest
 * between two walks, and never set foot on its rocks. A spot is where the feet
 * stand: the middle of a sprite's bottom edge, in the scene's own pixels. Pure:
 * the chance comes in as `random`, a function returning a number in [0, 1).
 */
import { TITLE_DEN, TITLE_PLAIN } from '../data/sprites'
import type { SceneArea } from './scene-fit'

export const WANDER = {
  /** How many walk at once (decision 227). */
  stage: 5,
  /** Scene pixels a second, at a walk. */
  walk: 24,
  /** Scene pixels a second, at a run: the first one's way in, and every way out. */
  run: 48,
  /** How far from where it comes in a walker first stops, at most, when there is a spot that near: it arrives, then it roams. */
  arrival: 90,
  /** The shortest and longest rest between two walks, in milliseconds. */
  rest: [1000, 4000],
  /** When several come in together: how long after one the next comes, in milliseconds. */
  stagger: 700,
  /** With more of them than walk at once: how long before the one out longest gives its place, in milliseconds. */
  turn: 12000,
  /** The shortest and longest wait between two ghosts in the light (decision 228), in milliseconds. */
  ghostGap: [6000, 10000],
  /** How soon the first ghost rises once the scene is there, in milliseconds. */
  ghostFirst: 2000,
} as const

export interface Spot {
  x: number
  y: number
}

/** The room a walker takes on the scene, in scene pixels: half its width, and its height with its name above it. */
export interface Build {
  half: number
  tall: number
}

/** A side of the screen: the bottom corner on it is where a walker comes in, or leaves. */
export type Side = 'left' | 'right'

/** Every spot from `left` to `right` and from `top` to `bottom`, ends included. */
export interface Reach {
  left: number
  top: number
  right: number
  bottom: number
}

/** Where one walker may go on the part of the scene a screen shows. */
export interface Ground {
  /** Where its feet may pass: its head and its name stay under the screen's top. */
  pass: Reach
  /** Where it may stop: there it shows whole. */
  rest: Reach
  /** The columns off the screen's sides where it is out of sight: it comes from one and leaves by one. */
  off: { left: number; right: number }
  half: number
  /** Every spot it may stop at. */
  stops: readonly Spot[]
}

/** How near the rocks' ground the feet may come, in pixels. */
const KEEP = 2
/** How far from the rocks' ground a way round them turns: far enough from `KEEP` to stay clear when its corners fall on whole pixels. */
const ROUND = 3.5
/** How near the screen's sides the feet may pass. */
const EDGE = 2
/** A corner of the screen: this many rows up from its bottom edge. */
const CORNER_ROWS = 8
/**
 * When nothing moves they stand round the den, on an oval about it: from
 * behind it (`from`, in degrees, 180 being straight to its left and 270
 * straight behind it) round its side to in front of it, over `arc` degrees,
 * as far from its rocks as `off` pixels and half the walker's width.
 */
const STAND = { from: 235, arc: 100, off: { x: 4, y: 8 } } as const

const between = (random: () => number, [low, high]: readonly [number, number]): number => Math.round(low + random() * (high - low))

/** How long a walker rests before it walks again, in milliseconds. */
export function restTime(random: () => number): number {
  return between(random, WANDER.rest)
}

/** How long until the next ghost rises in the light, in milliseconds. */
export function ghostWait(random: () => number): number {
  return between(random, WANDER.ghostGap)
}

// --- The den's ground ------------------------------------------------------------------------------------------------

/** Which side of the line from `from` to `to` a spot is on: over zero on one side, under on the other. */
const sideOf = (from: Spot, to: Spot, spot: Spot): number => (to.x - from.x) * (spot.y - from.y) - (to.y - from.y) * (spot.x - from.x)

const edgesOf = (outline: readonly Spot[]): [Spot, Spot][] => outline.map((from, at) => [from, outline[(at + 1) % outline.length] ?? from])

/** The way an outline with no dent turns: 1 or -1, the sign `sideOf` gives to what is inside it. */
function turnOf(outline: readonly Spot[]): number {
  const [first, second, third] = outline
  return first && second && third ? Math.sign(sideOf(first, second, third)) : 1
}

/** An outline with no dent, pushed out by `by` pixels on every side. */
function widen(outline: readonly Spot[], by: number): Spot[] {
  const turn = turnOf(outline)
  /** The way out of the edge from `from` to `to`, one pixel long. */
  const outOf = (from: Spot, to: Spot): Spot => {
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    return { x: (turn * (to.y - from.y)) / length, y: (-turn * (to.x - from.x)) / length }
  }
  return outline.map((corner, at) => {
    const before = outOf(outline[(at - 1 + outline.length) % outline.length] ?? corner, corner)
    const after = outOf(corner, outline[(at + 1) % outline.length] ?? corner)
    // Where the two edges meet once each is pushed out.
    const reach = by / (1 + before.x * after.x + before.y * after.y)
    return { x: corner.x + (before.x + after.x) * reach, y: corner.y + (before.y + after.y) * reach }
  })
}

/** What counts as inside: a spot on the line itself is not. */
const INSIDE = 1e-6

/** The ground no foot is set on: the rocks' own and a little more. */
const HELD = widen(TITLE_DEN.footprint, KEEP)
const HELD_TURN = turnOf(HELD)
/** The corners a way round the den turns at, on whole pixels. */
const CORNERS = widen(TITLE_DEN.footprint, ROUND).map(({ x, y }) => ({ x: Math.round(x), y: Math.round(y) }))

/** Whether the spot is on the ground no foot is set on. */
function held(spot: Spot): boolean {
  return edgesOf(HELD).every(([from, to]) => sideOf(from, to, spot) * HELD_TURN > INSIDE)
}

/** Whether the straight line between two spots goes over the ground no foot is set on. Along its edge is not over it. */
function crossesDen(from: Spot, to: Spot): boolean {
  // The part of the line that is on the inner side of every edge, as shares of its length.
  let start = 0
  let end = 1
  for (const [a, b] of edgesOf(HELD)) {
    const atStart = sideOf(a, b, from) * HELD_TURN - INSIDE
    const atEnd = sideOf(a, b, to) * HELD_TURN - INSIDE
    if (atStart <= 0 && atEnd <= 0) return false
    if (atStart > 0 && atEnd > 0) continue
    const crossing = atStart / (atStart - atEnd)
    if (atStart <= 0) start = Math.max(start, crossing)
    else end = Math.min(end, crossing)
  }
  return end - start > INSIDE
}

// --- Where a walker may go -------------------------------------------------------------------------------------------

/** Where a walker of this build may go, on the part of the scene the screen shows. */
export function groundOf(visible: SceneArea, build: Build): Ground {
  const bottom = visible.bottom
  const top = Math.min(bottom, Math.max(TITLE_PLAIN.ground, visible.top + Math.ceil(build.tall)))
  const room = Math.ceil(build.half) + 1
  const pass = { left: visible.left + EDGE, right: visible.right - EDGE, top, bottom }
  // Too wide to show whole anywhere: it stops where it may pass.
  const fits = visible.right - visible.left > 2 * room
  const rest = fits ? { left: visible.left + room, right: visible.right - room, top, bottom } : pass
  const stops: Spot[] = []
  for (let y = rest.top; y <= rest.bottom; y++) {
    for (let x = rest.left; x <= rest.right; x++) {
      if (restful({ x, y }, rest, build.half)) stops.push({ x, y })
    }
  }
  return { pass, rest, off: { left: visible.left - room - 1, right: visible.right + room + 1 }, half: build.half, stops }
}

const within = (reach: Reach, spot: Spot): boolean => spot.x >= reach.left && spot.x <= reach.right && spot.y >= reach.top && spot.y <= reach.bottom

/** Behind the den's light, which is drawn over whoever stands there: its columns, as far as a walker `half` that wide on either side. */
function behindLight(spot: Spot, half: number): boolean {
  const { light } = TITLE_DEN
  return spot.y < light.foot && spot.x > light.left - half && spot.x < light.right + half
}

/** Whether a walker may stop there: whole on the screen, off the rocks, and not hidden behind the light. */
function restful(spot: Spot, rest: Reach, half: number): boolean {
  return within(rest, spot) && !held(spot) && !behindLight(spot, half)
}

/** A spot to stop at, any of those it may stop at as likely as another; none if there is nowhere. */
function someSpot(ground: Ground, random: () => number): Spot | undefined {
  return ground.stops[Math.floor(random() * ground.stops.length)]
}

// --- Ways ------------------------------------------------------------------------------------------------------------

const far = (from: Spot, to: Spot): number => Math.hypot(to.x - from.x, to.y - from.y)

/**
 * The shortest way from one spot to another that keeps off the rocks: straight
 * if nothing is in the way, round the den by its corners otherwise. It gives
 * the spots to walk to, one after the other, the last being `to`; nothing if
 * there is no way.
 */
export function wayTo(from: Spot, to: Spot, ground: Ground): Spot[] | undefined {
  // In front of the den the plain ends a few rows under the rocks: the way round turns on its last row there. Corners off the
  // screen's sides are no way round: the den is then passed by its other side.
  const turns = CORNERS.map(({ x, y }) => ({ x, y: Math.min(y, ground.pass.bottom) })).filter((corner) => corner.x >= ground.pass.left && corner.x <= ground.pass.right)
  const spots = [from, ...turns, to]
  const last = spots.length - 1
  const length = spots.map((_, at) => (at === 0 ? 0 : Infinity))
  const through = new Array<number | undefined>(spots.length).fill(undefined)
  const left = new Set(spots.keys())
  while (left.size > 0) {
    let nearest: number | undefined
    for (const at of left) if (nearest === undefined || (length[at] ?? Infinity) < (length[nearest] ?? Infinity)) nearest = at
    if (nearest === undefined || length[nearest] === Infinity) return undefined
    if (nearest === last) break
    left.delete(nearest)
    const here = spots[nearest]
    for (const at of left) {
      const there = spots[at]
      if (!here || !there || crossesDen(here, there)) continue
      const by = (length[nearest] ?? Infinity) + far(here, there)
      if (by < (length[at] ?? Infinity)) {
        length[at] = by
        through[at] = nearest
      }
    }
  }
  const way: Spot[] = []
  for (let at: number | undefined = last; at !== undefined && at !== 0; at = through[at]) {
    const spot = spots[at]
    if (spot) way.unshift(spot)
  }
  return way
}

const lengthOf = (from: Spot, way: readonly Spot[]): number => way.reduce((sum, spot, at) => sum + far(way[at - 1] ?? from, spot), 0)

/** Where a walker stands out of sight, off a bottom corner of the screen. */
const door = (side: Side, ground: Ground, rowsUp: number): Spot => ({ x: ground.off[side], y: ground.pass.bottom - rowsUp })

/**
 * The way in: from out of sight off a bottom corner of the screen, the one on
 * the side given, to a first spot not far from there, where it arrives before
 * it roams. The first of the spots given is where the walker is put, out of
 * sight; it walks to the others in turn.
 */
export function wayIn(ground: Ground, side: Side, random: () => number): Spot[] {
  const from = door(side, ground, Math.floor(random() * (CORNER_ROWS + 1)))
  // With nowhere to stop, or no way there: just inside the corner it came by.
  const corner = { x: side === 'left' ? ground.pass.left : ground.pass.right, y: from.y }
  const near = ground.stops.filter((stop) => far(from, stop) <= WANDER.arrival)
  const to = near[Math.floor(random() * near.length)] ?? someSpot(ground, random) ?? corner
  return [from, ...(wayTo(from, to, ground) ?? [corner])]
}

/** The next walk: the way to another spot to stop at. Nothing when there is nowhere else to go: the walker stays. */
export function nextWalk(from: Spot, ground: Ground, random: () => number): Spot[] {
  const to = someSpot(ground, random)
  return to ? (wayTo(from, to, ground) ?? []) : []
}

/** The way out: to out of sight off the bottom corner of the screen that is the shorter walk away. */
export function wayOut(from: Spot, ground: Ground): Spot[] {
  const ways = (['left', 'right'] as const).map((side) => {
    const to = door(side, ground, CORNER_ROWS / 2)
    // With no way round, straight out: a walker must not stay for want of a way.
    return wayTo(from, to, ground) ?? [to]
  })
  const [left = [], right = []] = ways
  return lengthOf(from, left) <= lengthOf(from, right) ? left : right
}

// --- A walk, as the screen shows it ----------------------------------------------------------------------------------

/** One straight walk: how long it lasts, and how many columns and rows it crosses, one pixel at a time. */
export interface Leg {
  seconds: number
  columns: number
  rows: number
}

/** The walk from one spot to the next at `pace` scene pixels a second. */
export function legOf(from: Spot, to: Spot, pace: number): Leg {
  const columns = Math.abs(to.x - from.x)
  const rows = Math.abs(to.y - from.y)
  return { seconds: Math.hypot(columns, rows) / pace, columns, rows }
}

// --- Standing still --------------------------------------------------------------------------------------------------

const columnsOf = TITLE_DEN.footprint.map(({ x }) => x)
const rowsOf = TITLE_DEN.footprint.map(({ y }) => y)
/** The middle of the rocks' ground, and half its width and height. */
const DEN = {
  x: (Math.min(...columnsOf) + Math.max(...columnsOf)) / 2,
  y: (Math.min(...rowsOf) + Math.max(...rowsOf)) / 2,
  halfWide: (Math.max(...columnsOf) - Math.min(...columnsOf)) / 2,
  halfTall: (Math.max(...rowsOf) - Math.min(...rowsOf)) / 2,
}

/**
 * Where the walker stands when nothing moves (reduced motion, or the Options'
 * switch): `index` of `count`, round the den, the first to its left, the next
 * to its right and so on, each side filled from behind the den to in front of
 * it. It stands on the spot it may stop at that is nearest its place there.
 */
export function standing(index: number, count: number, ground: Ground): Spot {
  const onLeft = index % 2 === 0
  const onItsSide = Math.ceil((count - (onLeft ? 0 : 1)) / 2)
  const turn = ((STAND.from - (Math.floor(index / 2) / Math.max(2, onItsSide)) * STAND.arc) * Math.PI) / 180
  const aside = (DEN.halfWide + ground.half + STAND.off.x) * Math.cos(turn)
  const place = { x: DEN.x + (onLeft ? aside : -aside), y: DEN.y + (DEN.halfTall + STAND.off.y) * Math.sin(turn) }
  let nearest: Spot | undefined
  for (const stop of ground.stops) if (!nearest || far(place, stop) < far(place, nearest)) nearest = stop
  // With nowhere to stop: in the middle of the screen's last row, before the den.
  return nearest ?? { x: Math.round((ground.pass.left + ground.pass.right) / 2), y: ground.pass.bottom }
}

// --- Whose turn ------------------------------------------------------------------------------------------------------

/**
 * Which of `count` characters are out, by their place in the list, at the
 * `turn`th turn (decision 227): all of them while they are few enough,
 * otherwise `stage` of them, the one out longest giving its place to the next
 * at each turn, so that every one is out in its turn.
 */
export function onStage(count: number, turn: number, stage: number = WANDER.stage): number[] {
  if (count <= stage) return Array.from({ length: count }, (_, index) => index)
  return Array.from({ length: stage }, (_, place) => (turn + place) % count)
}

/** How one comes in: how long it waits first, in milliseconds, whether it runs, and by which side when that is settled. */
export interface Arrival {
  wait: number
  runs: boolean
  /** Several coming in together take the two sides in turn; one coming in alone comes by either. */
  side?: Side
}

/**
 * How those who were not out `before` come in, by their name in `now`: one
 * after the other, `stagger` apart, from the left then from the right and so
 * on, so that they do not all crowd one corner. The first one onto an empty
 * plain runs, so that the screen says at once whose it is; the others walk.
 */
export function arrivals(before: readonly string[], now: readonly string[]): Map<string, Arrival> {
  const fresh = now.filter((name) => !before.includes(name))
  return new Map(
    fresh.map((name, place): [string, Arrival] => {
      const how = { wait: place * WANDER.stagger, runs: before.length === 0 && place === 0 }
      return [name, fresh.length > 1 ? { ...how, side: place % 2 === 0 ? 'left' : 'right' } : how]
    }),
  )
}

// --- Their size ------------------------------------------------------------------------------------------------------

/**
 * The size of one pixel of a walker's sprite, in CSS pixels: half a pixel of
 * the scene, so that a Pokémon is small beside the den, on whole device pixels
 * so that it stays sharp. `scenePixel` is one pixel of the scene in CSS
 * pixels, itself a whole number of device pixels.
 */
export function walkerPixel(scenePixel: number, ratio: number): number {
  const devicePixelRatio = ratio > 0 ? ratio : 1
  return Math.max(1, Math.floor(Math.round(scenePixel * devicePixelRatio) / 2)) / devicePixelRatio
}
