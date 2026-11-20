/**
 * The wheel of the Pokédex (decision 290), in numbers: a list wrapped round a
 * drum seen from its side. The row in the middle faces the viewer; the rows
 * above and below turn away, so they are shorter, smaller, fainter, and drawn
 * in from the far end, until they are over the edge and gone. Pure: the
 * component reads how far the list has turned and draws what this says.
 *
 * Lengths are in DS pixels. A row's height is the arc it takes on the drum,
 * so rows never overlap; the drum is as tall as the wheel.
 */

/** A wheel's size: how tall it is, and how tall the row in its middle. */
export interface WheelSize {
  height: number
  row: number
}

/** How one row is drawn. */
export interface RowPose {
  /** How far its middle is from the wheel's, down the screen. */
  y: number
  /** How large it is drawn, across and down: 1 in the middle. */
  scaleX: number
  scaleY: number
  /** How bright: 1 in the middle. */
  opacity: number
  /** Whether it is on the side of the drum that faces the viewer. */
  shown: boolean
}

/** A quarter turn: past it a row is on the far side of the drum. */
const QUARTER = Math.PI / 2
/** How far the viewer stands from the drum, in radii: nearer, and the rows at the edges shrink more. */
const VIEW = 4
/** How bright a row at the very edge still is. */
const FAINTEST = 0.35

const radiusOf = (size: WheelSize): number => size.height / 2

/** How a row is drawn when it is `rows` rows from the middle: under it when positive, above when negative, and by a part of a row while the wheel turns. */
export function poseOf(rows: number, size: WheelSize): RowPose {
  const radius = radiusOf(size)
  const angle = (rows * size.row) / radius
  if (Math.abs(angle) >= QUARTER) return { y: Math.sign(angle) * radius, scaleX: 0, scaleY: 0, opacity: 0, shown: false }
  const facing = Math.cos(angle)
  // Further from the viewer by what the drum's curve takes it back.
  const near = VIEW / (VIEW + (1 - facing))
  return { y: radius * Math.sin(angle), scaleX: near, scaleY: near * facing, opacity: FAINTEST + (1 - FAINTEST) * facing, shown: true }
}

/**
 * The row drawn at a point of the wheel, `offset` DS pixels under its middle
 * (over it when negative), for a list turned by `turn` rows: the one whose
 * drawn height holds the point. Nothing between two rows, past the ends of the
 * list, or off the wheel.
 */
export function rowAt(offset: number, turn: number, count: number, size: WheelSize): number | undefined {
  const reach = reachOf(size)
  const middle = Math.round(turn)
  for (let row = Math.max(0, middle - reach - 1); row <= Math.min(count - 1, middle + reach + 1); row++) {
    const pose = poseOf(row - turn, size)
    if (pose.shown && Math.abs(offset - pose.y) <= (pose.scaleY * size.row) / 2) return row
  }
  return undefined
}

/** How many rows show on either side of the middle one. */
export function reachOf(size: WheelSize): number {
  return Math.ceil((QUARTER * radiusOf(size)) / size.row) - 1
}

/** The rows to draw round the one nearest the middle, first and last included: those that show, and one more each way for the turn in progress. */
export function rowsDrawn(nearest: number, count: number, size: WheelSize): { first: number; last: number } {
  const around = reachOf(size) + 1
  return { first: Math.max(0, nearest - around), last: Math.min(count - 1, nearest + around) }
}

/** How far the list has turned, in rows, from how far it has scrolled: 0 with the first row in the middle. */
export function turnOf(scrolled: number, pitch: number, count: number): number {
  if (count <= 0 || pitch <= 0) return 0
  return Math.min(count - 1, Math.max(0, scrolled / pitch))
}

/** The row nearest the middle. */
export function nearestRow(scrolled: number, pitch: number, count: number): number {
  return Math.round(turnOf(scrolled, pitch, count))
}

/** Where a key takes the wheel from a row: the arrows by one, Page Up and Page Down by a wheel's worth, Home and End to the ends. Nothing for any other key. */
export function rowByKey(key: string, from: number, count: number, size: WheelSize): number | undefined {
  const page = 2 * reachOf(size) + 1
  const steps: Readonly<Record<string, number>> = { ArrowUp: -1, ArrowDown: 1, PageUp: -page, PageDown: page, Home: -count, End: count }
  const by = steps[key]
  return by === undefined || count === 0 ? undefined : Math.min(count - 1, Math.max(0, from + by))
}

/**
 * The row a name being typed goes to: the next one after `from` whose name
 * starts with what was typed, going round the list; `from` itself when it
 * still answers more than one letter. Names and letters are compared as given:
 * the caller takes accents and capitals off both.
 */
export function rowByName(names: readonly string[], from: number, typed: string): number | undefined {
  if (typed === '' || names.length === 0) return undefined
  // More letters of the same name narrow down from where the wheel is; a first letter moves on to the next name.
  const start = typed.length > 1 ? from : from + 1
  for (let step = 0; step < names.length; step++) {
    const row = (start + step) % names.length
    if (names[row]?.startsWith(typed)) return row
  }
  return undefined
}

/** The rail beside a wheel: where its thumb is and how long, as shares of the rail, for a list turned by `turn` rows. */
export function thumbOf(turn: number, count: number, size: WheelSize): { start: number; length: number } {
  const seen = 2 * reachOf(size) + 1
  if (count <= seen) return { start: 0, length: 1 }
  const length = Math.max(THUMB_SHORTEST, seen / count)
  return { start: (turn / (count - 1)) * (1 - length), length }
}

/** The shortest a rail's thumb gets, as a share of the rail: a long list must still leave something to take hold of. */
const THUMB_SHORTEST = 0.12

/** The row a point of the rail stands for, `share` of the way down it. */
export function rowOnRail(share: number, count: number): number {
  return Math.round(Math.min(1, Math.max(0, share)) * Math.max(0, count - 1))
}

/**
 * Where to jump before sliding to a far row, so that the slide is short: a few
 * rows before the row, on the side the wheel comes from. Nothing when the row
 * is near enough to slide to from where the wheel is.
 */
export function jumpBefore(from: number, to: number, size: WheelSize): number | undefined {
  const near = reachOf(size)
  if (Math.abs(to - from) <= 2 * near) return undefined
  return to > from ? to - near : to + near
}
