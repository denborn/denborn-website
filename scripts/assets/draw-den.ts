/**
 * Draws the den of the title screen (decision 210): a ring of rocks and the
 * light that rises out of it, as SVG pictures made of rectangles on whole
 * coordinates. One unit is one pixel of the title screen's plain (Showdown's
 * meadow), and the rocks are drawn in the plain's manner: flat tones, an edge
 * in their own darkest tone, no black line. The drawing is this file's data;
 * the pictures in public/ are written from it and committed.
 *
 *   node scripts/assets/draw-den.ts                    writes public/den-*.svg, the layers the title screen stacks
 *   node scripts/assets/draw-den.ts --whole <folder>   also writes the whole den there in one file, still and animated
 *
 * It stops without writing if the pictures no longer have the places and
 * sizes the app expects (TITLE_DEN in src/data/sprites.ts).
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TITLE_DEN } from '../../src/data/sprites.ts'
import { ROOT } from '../data/lib/pinned.ts'

// --- The colours -----------------------------------------------------------------------------------------------------

interface Paint {
  fill: string
  /** Under 1, what is behind shows through. */
  opacity?: number
}

/** Every colour of the drawing, in the order a picture lists them. */
const PALETTE = {
  topLight: { fill: '#EFCFC2' },
  top: { fill: '#DCB4A9' },
  sideLight: { fill: '#B48886' },
  side: { fill: '#946C6B' },
  sideDark: { fill: '#745557' },
  edge: { fill: '#553C42' },
  rim: { fill: '#FF9CCB' },
  pitDark: { fill: '#3F2B33' },
  pitHole: { fill: '#2B1C25' },
  pitDeep: { fill: '#8E2F5C' },
  pit: { fill: '#C43F7C' },
  pitHot: { fill: '#EE5C9B' },
  spillFar: { fill: '#FF6FC0', opacity: 0.14 },
  spill: { fill: '#FF6FC0', opacity: 0.24 },
  spillNear: { fill: '#FF6FC0', opacity: 0.36 },
  glowFar: { fill: '#FF8CC0', opacity: 0.16 },
  glow: { fill: '#FF8CC0', opacity: 0.32 },
  glowNear: { fill: '#FF8CC0', opacity: 0.5 },
  light0: { fill: '#FFE4F4', opacity: 0.94 },
  light1: { fill: '#FFBCE3', opacity: 0.9 },
  light2: { fill: '#FF8FD0', opacity: 0.86 },
  light3: { fill: '#EE5CB4', opacity: 0.76 },
  halo: { fill: '#EE5CB4', opacity: 0.32 },
  haloFar: { fill: '#EE5CB4', opacity: 0.16 },
  streak: { fill: '#FFFFFF', opacity: 0.45 },
} as const satisfies Record<string, Paint>

type Tone = keyof typeof PALETTE
const TONES = Object.keys(PALETTE) as Tone[]

/** A rock's tones from the lightest to the darkest: a face in shade takes the next one. */
const ROCK_RAMP: readonly Tone[] = ['topLight', 'top', 'sideLight', 'side', 'sideDark', 'edge']
const darker = (tone: Tone): Tone => ROCK_RAMP[Math.min(ROCK_RAMP.indexOf(tone) + 1, ROCK_RAMP.length - 1)] ?? 'edge'

// --- Pixels ----------------------------------------------------------------------------------------------------------

/** A rectangle of the drawing's pixels. */
interface Area {
  left: number
  top: number
  width: number
  height: number
}

/** The whole drawing. */
const DEN: Area = { left: 0, top: 0, width: 128, height: 160 }
/** The part the rocks stand in: the title screen's pictures of the rocks show this and no more. */
const RING: Area = { left: 0, top: 100, width: 128, height: 60 }
/** The ground the light falls on, wider than the ring. */
const SPILL: Area = { left: -16, top: 92, width: 160, height: 70 }

const contains = (area: Area, x: number, y: number): boolean =>
  x >= area.left && x < area.left + area.width && y >= area.top && y < area.top + area.height

function eachPixel(area: Area, visit: (x: number, y: number) => void): void {
  for (let y = area.top; y < area.top + area.height; y++) {
    for (let x = area.left; x < area.left + area.width; x++) visit(x, y)
  }
}

/** One tone, or none, for each pixel of an area. */
interface Grid {
  readonly area: Area
  readonly cells: (Tone | undefined)[]
}

const newGrid = (area: Area): Grid => ({ area, cells: new Array<Tone | undefined>(area.width * area.height).fill(undefined) })
const cellOf = (area: Area, x: number, y: number): number => (y - area.top) * area.width + (x - area.left)
const toneAt = (grid: Grid, x: number, y: number): Tone | undefined =>
  contains(grid.area, x, y) ? grid.cells[cellOf(grid.area, x, y)] : undefined

function put(grid: Grid, x: number, y: number, tone: Tone | undefined): void {
  if (contains(grid.area, x, y)) grid.cells[cellOf(grid.area, x, y)] = tone
}

/** Puts a tone where there is none yet. Two see-through tones on one pixel would add up, so that is refused. */
function claim(grid: Grid, x: number, y: number, tone: Tone): void {
  const taken = toneAt(grid, x, y)
  if (taken) throw new Error(`${tone} and ${taken} both want the pixel ${x}, ${y}`)
  put(grid, x, y, tone)
}

/** The pixels of `grid` that none of `covers` hides. */
function without(grid: Grid, ...covers: Grid[]): Grid {
  const left = newGrid(grid.area)
  eachPixel(grid.area, (x, y) => {
    const tone = toneAt(grid, x, y)
    if (tone && !covers.some((cover) => toneAt(cover, x, y))) put(left, x, y, tone)
  })
  return left
}

/** `grid` with `top` laid over it. */
function under(grid: Grid, top: Grid): Grid {
  const both = newGrid(grid.area)
  eachPixel(grid.area, (x, y) => {
    const tone = toneAt(top, x, y) ?? toneAt(grid, x, y)
    if (tone) put(both, x, y, tone)
  })
  return both
}

/** A number from 0 to 1 that is always the same for the same pixel and seed. */
function hash(x: number, y: number, seed = 0): number {
  let mixed = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0
  mixed = Math.imul(mixed ^ (mixed >>> 13), 1274126177)
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296
}

// --- The rocks -------------------------------------------------------------------------------------------------------

type Point = readonly [x: number, y: number]

interface Rock {
  /** Gives the rock an unevenness of its own. */
  seed: number
  /** Behind the light, or in front of it. */
  row: 'behind' | 'front'
  /** The outline of its flat top. */
  top: readonly Point[]
  /** How many pixels its sides fall below its top. */
  drop: number
  /** How tall the plain's grass may stand in front of its foot, in pixels. */
  grass: number
}

/** The rocks from the farthest to the nearest: each is drawn over the ones before. */
const ROCKS: readonly Rock[] = [
  { seed: 2, row: 'behind', drop: 5, grass: 0, top: [[46, 107], [51, 104], [71, 104], [77, 106], [73, 109], [51, 109]] },
  { seed: 3, row: 'behind', drop: 6, grass: 1, top: [[4, 113], [11, 110], [42, 110], [48, 113], [43, 117], [9, 117]] },
  { seed: 4, row: 'behind', drop: 7, grass: 1, top: [[74, 112], [82, 108], [103, 107], [113, 110], [112, 113], [103, 116], [82, 116]] },
  { seed: 5, row: 'front', drop: 19, grass: 3, top: [[3, 122], [11, 117], [42, 116], [54, 120], [55, 124], [48, 129], [13, 128], [5, 126]] },
  { seed: 6, row: 'front', drop: 21, grass: 3, top: [[86, 123], [96, 119], [118, 119], [126, 123], [123, 128], [114, 130], [93, 129]] },
  { seed: 7, row: 'front', drop: 18, grass: 3, top: [[42, 132], [49, 126], [85, 125], [95, 130], [94, 136], [86, 139], [50, 139]] },
  { seed: 8, row: 'front', drop: 11, grass: 3, top: [[94, 139], [97, 137], [105, 137], [108, 139], [105, 142], [96, 142]] },
  { seed: 9, row: 'front', drop: 8, grass: 3, top: [[36, 143], [39, 141], [48, 141], [51, 143], [48, 146], [39, 146]] },
]

/** Where the light stands on the ground, in the middle of the ring. */
const LIGHT_FOOT = { x: 64, y: 121 }
/** A side turned at least this much to the left or to the right is a facet of its own, lit or in shade. */
const FACET_TURN = 0.12
/** How far down a side its two darker layers run, as shares of its drop. */
const STRATA = [0.36, 0.7]

type Mask = Set<number>
const mark = (mask: Mask, x: number, y: number): void => {
  if (contains(DEN, x, y)) mask.add(cellOf(DEN, x, y))
}
const marked = (mask: Mask, x: number, y: number): boolean => contains(DEN, x, y) && mask.has(cellOf(DEN, x, y))

/** Each edge of an outline, as its two ends. */
const edgesOf = (outline: readonly Point[]): [Point, Point][] => outline.map((from, at) => [from, outline[(at + 1) % outline.length] ?? from])

/** The pixels whose centre is inside the outline. */
function rasterOutline(outline: readonly Point[]): Mask {
  const mask: Mask = new Set()
  eachPixel(DEN, (x, y) => {
    const px = x + 0.5
    const py = y + 0.5
    let within = false
    for (const [[ax, ay], [bx, by]] of edgesOf(outline)) {
      if (ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) within = !within
    }
    if (within) mark(mask, x, y)
  })
  return mask
}

/**
 * Which way the side under column `x` faces, from -1 (to the left, lit) to 1
 * (to the right, in shade): it is the way the front edge of the top above it turns.
 */
function facing(outline: readonly Point[], x: number): number {
  const px = x + 0.5
  let lowest = -Infinity
  let turn = 0
  for (const [[ax, ay], [bx, by]] of edgesOf(outline)) {
    if (ax === bx || px < Math.min(ax, bx) || px >= Math.max(ax, bx)) continue
    const y = ay + ((px - ax) / (bx - ax)) * (by - ay)
    if (y <= lowest) continue
    lowest = y
    const run = bx - ax
    const rise = by - ay
    turn = (run > 0 ? -rise : rise) / Math.hypot(run, rise)
  }
  return turn
}

/** A rock's sides do not end on a ruled line: a pixel more or less, in slow steps. */
const unevenDrop = (rock: Rock, x: number): number =>
  rock.drop + Math.round(Math.sin(x * 0.61 + rock.seed * 2.3) * 0.7 + Math.sin(x * 0.19 + rock.seed) * 0.6)

/**
 * How tall the grass stands in front of the rock's foot, column by column:
 * pointed tufts, like the plain's own. Nothing is drawn there, so that the
 * plain itself shows, whatever it is at that place: grass, or bare ground.
 */
function grassHeights(rock: Rock): Map<number, number> {
  const heights = new Map<number, number>()
  let middle = Math.floor(hash(0, 0, rock.seed + 60) * 4)
  while (middle < DEN.width) {
    const tall = Math.round(hash(middle, 1, rock.seed + 60) * rock.grass)
    for (let aside = 1 - tall; aside < tall; aside++) {
      const x = middle + aside
      heights.set(x, Math.max(heights.get(x) ?? 0, tall - Math.abs(aside)))
    }
    middle += 3 + Math.floor(hash(middle, 2, rock.seed + 60) * 4)
  }
  return heights
}

interface RockShape {
  /** Its flat top. */
  top: Mask
  /** The top and the sides under it. */
  body: Mask
  /** The body, less what the grass hides at its foot. */
  shown: Mask
  /** The lowest row of each column of the body. */
  foot: Map<number, number>
}

function shapeOf(rock: Rock): RockShape {
  const top = rasterOutline(rock.top)
  const body: Mask = new Set()
  const foot = new Map<number, number>()
  eachPixel(DEN, (x, y) => {
    if (!marked(top, x, y)) return
    const drop = unevenDrop(rock, x)
    for (let down = 0; down <= drop; down++) mark(body, x, y + down)
    foot.set(x, Math.max(foot.get(x) ?? 0, y + drop))
  })
  const grass = grassHeights(rock)
  const shown: Mask = new Set()
  eachPixel(DEN, (x, y) => {
    const inGrass = !marked(top, x, y) && (foot.get(x) ?? 0) - y < (grass.get(x) ?? 0)
    if (marked(body, x, y) && !inGrass) mark(shown, x, y)
  })
  return { top, body, shown, foot }
}

const onOutline = (shape: RockShape, x: number, y: number): boolean =>
  !marked(shape.body, x - 1, y) || !marked(shape.body, x + 1, y) || !marked(shape.body, x, y - 1) || !marked(shape.body, x, y + 1)

function topTone(rock: Rock, shape: RockShape, x: number, y: number): Tone {
  if (onOutline(shape, x, y)) return marked(shape.body, x, y - 1) ? 'sideDark' : 'side'
  // The lip: the front edge of the top catches the daylight.
  if (!marked(shape.top, x, y + 1)) return 'topLight'
  const speck = hash(x, y, rock.seed + 40)
  if (speck < 0.012) return 'topLight'
  return speck > 0.99 ? 'sideLight' : 'top'
}

function sideTone(rock: Rock, shape: RockShape, x: number, y: number): Tone {
  if (onOutline(shape, x, y)) return 'edge'
  const turn = facing(rock.top, x)
  const face: Tone = turn < -FACET_TURN ? 'sideLight' : turn > FACET_TURN ? 'sideDark' : 'side'
  let below = 1
  while (!marked(shape.top, x, y - below) && below < DEN.height) below++
  const inLayer = STRATA.some((share) => Math.round(rock.drop * share) === below) && hash(Math.floor((x + rock.seed * 5) / 3), below, rock.seed) < 0.5
  // The foot of a side is in shade, up to an uneven line.
  const atFoot = (shape.foot.get(x) ?? 0) - y <= 2 + Math.round(hash(x >> 2, 0, rock.seed + 20) * 2)
  if (inLayer && atFoot) return darker(darker(face))
  return inLayer || atFoot ? darker(face) : face
}

interface Band {
  tone: Tone
  /** Half its width and half its height. */
  rx: number
  ry: number
}

/** The tone of the innermost of the bands, one inside the other around `middle`, that holds a pixel. `uneven` breaks their edges column by column, like grass. */
function bandAt(middle: { x: number; y: number }, bands: readonly Band[], uneven: number, x: number, y: number): Tone | undefined {
  const holds = ({ rx, ry }: Band): boolean => ((x + 0.5 - middle.x) / rx) ** 2 + ((y + 0.5 - middle.y) / ry) ** 2 + (hash(x, 0, 90) - 0.5) * uneven <= 1
  return bands.findLast(holds)?.tone
}

/** The light on the rocks, fainter with the distance from its foot. It is laid over them, see-through, so that their own tones still show. */
const GLOW_BANDS: readonly Band[] = [
  { tone: 'glowFar', rx: 50, ry: 21 },
  { tone: 'glow', rx: 37, ry: 15.5 },
  { tone: 'glowNear', rx: 25, ry: 10.5 },
]

interface RockRow {
  rocks: Grid
  /** What the light adds: it falls on the tops, and on the sides the rocks behind it turn to it. */
  glow: Grid
}

function paintRocks(row: Rock['row']): RockRow {
  const rocks = newGrid(DEN)
  const glow = newGrid(DEN)
  for (const rock of ROCKS.filter((each) => each.row === row)) {
    const shape = shapeOf(rock)
    eachPixel(DEN, (x, y) => {
      if (!marked(shape.shown, x, y)) return
      const flat = marked(shape.top, x, y)
      put(rocks, x, y, flat ? topTone(rock, shape, x, y) : sideTone(rock, shape, x, y))
      // A nearer rock hides the light that fell on the one behind it.
      put(glow, x, y, flat || row === 'behind' ? bandAt(LIGHT_FOOT, GLOW_BANDS, 0.16, x, y) : undefined)
    })
  }
  return { rocks, glow }
}

// --- The pit, and the light on the ground ----------------------------------------------------------------------------

/** The ground inside the ring by day: a dark hole. */
const PIT_BY_DAY: readonly Band[] = [
  { tone: 'pitDark', rx: 27, ry: 10 },
  { tone: 'pitHole', rx: 18, ry: 6 },
]
/** The same ground under the light: hotter toward the light's foot. */
const PIT_LIT: readonly Band[] = [
  { tone: 'pitDeep', rx: 27, ry: 10 },
  { tone: 'pit', rx: 22, ry: 7.5 },
  { tone: 'pitHot', rx: 16, ry: 5 },
]
/** The light on the ground around the ring, fainter with the distance. */
const SPILL_BANDS: readonly Band[] = [
  { tone: 'spillFar', rx: 76, ry: 30 },
  { tone: 'spill', rx: 62, ry: 23 },
  { tone: 'spillNear', rx: 47, ry: 16 },
]
const SPILL_MIDDLE = { x: 64, y: 129 }

function paintBands(area: Area, middle: { x: number; y: number }, bands: readonly Band[], uneven = 0): Grid {
  const grid = newGrid(area)
  eachPixel(area, (x, y) => put(grid, x, y, bandAt(middle, bands, uneven, x, y)))
  return grid
}

// --- The light -------------------------------------------------------------------------------------------------------

/** The light is cut in cells of this many pixels: a strip is one cell wide, a square of its fade fits in one. */
const CELL = 5
const LIGHT_LEFT = 44
const LIGHT_CELLS = 8
const LIGHT_RIGHT = LIGHT_LEFT + LIGHT_CELLS * CELL
/** The light's top fades in squares over this many rows of cells; below, it is whole. */
const FADE_ROWS = 11
const FADE_END = FADE_ROWS * CELL
/** The frames of the light's loop. The fade's uneven part repeats after as many rows of cells, so that the loop closes. */
const FRAMES = 8
/** The row the light stops at, out of sight behind the rocks in front. */
const LIGHT_END = 127
/**
 * One frame of the light as the title screen shows it: wide enough for the
 * sparks beside it, and tall enough to reach from the top of the tallest
 * screen down to the rocks. A shorter screen shows less of its lower part.
 */
const LIGHT_FRAME: Area = { left: 37, top: 0, width: 54, height: 135 }

/** How many cells a cell is from the light's middle: 0 for the two in the middle, 3 at the edges. */
const fromMiddle = (cell: number): number => (cell < LIGHT_CELLS / 2 ? LIGHT_CELLS / 2 - 1 - cell : cell - LIGHT_CELLS / 2)
const lightTone = (cell: number): Tone => (['light0', 'light1', 'light2', 'light3'] as const)[fromMiddle(cell)] ?? 'light3'

/**
 * How big the fade's square is in each cell of one strip, from the top row
 * down: the whole cell at the bottom, then smaller and fewer, sooner at the
 * light's edges than in its middle. `frame` moves the uneven part up by one
 * cell. No whole cell stands above a smaller square: a strip ends where it
 * first breaks.
 */
function fadeSides(cell: number, frame: number): number[] {
  const lift = (hash(cell, 0, 80) - 0.5) * 0.2
  const sides = new Array<number>(FADE_ROWS).fill(0)
  let broken = false
  for (let row = FADE_ROWS - 1; row >= 0; row--) {
    const height = (row + 0.5) / FADE_ROWS
    const uneven = (hash(cell, (row + frame) % FRAMES, 77) - 0.5) * (0.16 + 0.5 * (1 - height))
    const strength = height - fromMiddle(cell) * 0.03 + lift + uneven
    let side = strength < 0.14 ? 0 : strength < 0.3 ? 1 : strength < 0.46 ? 2 : strength < 0.7 ? 3 : CELL
    if (side < CELL) broken = true
    else if (broken) side = 3
    sides[row] = side
  }
  return sides
}

/** The fade: one square a cell. The big ones sit in the middle of their cell, the small ones anywhere in it. */
function paintFade(grid: Grid, frame: number): void {
  for (let cell = 0; cell < LIGHT_CELLS; cell++) {
    fadeSides(cell, frame).forEach((side, row) => {
      const slack = CELL - side
      const drift = (row + frame) % FRAMES
      const loose = side < 3
      const left = LIGHT_LEFT + cell * CELL + (loose ? Math.round(hash(cell, drift, 78) * slack) : slack / 2)
      const top = row * CELL + (loose ? Math.round(hash(cell, drift, 79) * slack) : slack / 2)
      eachPixel({ left, top, width: side, height: side }, (x, y) => claim(grid, x, y, lightTone(cell)))
    })
  }
}

/** The whole part of the light, in strips, with a fainter line on either side of it: its halo. */
function paintBody(grid: Grid): void {
  const halo: readonly [number, Tone][] = [
    [LIGHT_LEFT - 2, 'haloFar'],
    [LIGHT_LEFT - 1, 'halo'],
    [LIGHT_RIGHT, 'halo'],
    [LIGHT_RIGHT + 1, 'haloFar'],
  ]
  for (let y = FADE_END; y < grid.area.top + grid.area.height; y++) {
    for (let x = LIGHT_LEFT; x < LIGHT_RIGHT; x++) claim(grid, x, y, lightTone(Math.floor((x - LIGHT_LEFT) / CELL)))
    for (const [x, tone] of halo) claim(grid, x, y, tone)
  }
}

/** Sparks beside the light: each rises for the loop's frames, getting smaller, then starts again. */
const SPARKS = [
  { x: 39, y: 100, start: 0 },
  { x: 87, y: 88, start: 3 },
  { x: 40, y: 70, start: 5 },
  { x: 88, y: 62, start: 6 },
] as const
const SPARK_RISE = 3

function paintSparks(grid: Grid, frame: number): void {
  for (const { x, y, start } of SPARKS) {
    const age = (frame + start) % FRAMES
    const side = age < FRAMES / 2 ? 2 : 1
    eachPixel({ left: x, top: y - age * SPARK_RISE, width: side, height: side }, (sparkX, sparkY) => claim(grid, sparkX, sparkY, age < 6 ? 'light2' : 'light3'))
  }
}

/** Brighter streaks that climb the whole part of the light, a cell a frame: where each starts, and how long it is. */
const STREAKS = [
  { x: 49, from: 6, length: 9 },
  { x: 54, from: 22, length: 13 },
  { x: 60, from: 13, length: 7 },
  { x: 67, from: 28, length: 12 },
  { x: 73, from: 3, length: 8 },
  { x: 78, from: 17, length: 11 },
] as const
/** A streak comes again after this many rows: what it climbs in one loop. */
const STREAK_GAP = FRAMES * CELL

interface LightFrame {
  /** The fade, the whole part with its halo, and the sparks: no two of them on one pixel. */
  light: Grid
  /** Laid over the light, which they brighten. */
  streaks: Grid
}

function lightFrame(area: Area, frame: number): LightFrame {
  const light = newGrid(area)
  paintFade(light, frame)
  paintBody(light)
  paintSparks(light, frame)
  const streaks = newGrid(area)
  for (const { x, from, length } of STREAKS) {
    for (let y = FADE_END + CELL; y < area.top + area.height; y++) {
      const along = (((y + frame * CELL - from) % STREAK_GAP) + STREAK_GAP) % STREAK_GAP
      if (along < length) put(streaks, x, y, 'streak')
    }
  }
  return { light, streaks }
}

const lightStandsAt = (x: number, y: number): boolean => x >= LIGHT_LEFT && x < LIGHT_RIGHT && y >= FADE_END && y < LIGHT_END

/** The light's pink edge on the rocks in front of it: where a rock's outline stands against the light. */
function rimOf(rocks: Grid): Grid {
  const rim = newGrid(rocks.area)
  eachPixel(rocks.area, (x, y) => {
    if (!toneAt(rocks, x, y)) return
    const against = [[x, y - 1], [x - 1, y], [x + 1, y]] as const
    if (against.some(([nextX, nextY]) => lightStandsAt(nextX, nextY) && !toneAt(rocks, nextX, nextY))) put(rim, x, y, 'rim')
  })
  return rim
}

// --- From pixels to rectangles ---------------------------------------------------------------------------------------

interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

/** Few rectangles that cover exactly the pixels of one tone: a run along a row, grown down while the rows below match. */
function rectangles(grid: Grid, tone: Tone): Rectangle[] {
  const taken: Mask = new Set()
  const key = (x: number, y: number): number => cellOf(grid.area, x, y)
  const free = (x: number, y: number): boolean => toneAt(grid, x, y) === tone && !taken.has(key(x, y))
  const found: Rectangle[] = []
  eachPixel(grid.area, (x, y) => {
    if (!free(x, y)) return
    let width = 1
    while (free(x + width, y)) width++
    let height = 1
    const rowIsFree = (row: number): boolean => Array.from({ length: width }, (_, across) => free(x + across, row)).every(Boolean)
    while (rowIsFree(y + height)) height++
    eachPixel({ left: x, top: y, width, height }, (takenX, takenY) => taken.add(key(takenX, takenY)))
    found.push({ x, y, width, height })
  })
  const covered = found.reduce((sum, { width, height }) => sum + width * height, 0)
  const wanted = grid.cells.filter((cell) => cell === tone).length
  if (covered !== wanted) throw new Error(`The rectangles of ${tone} cover ${covered} pixels, not its ${wanted}`)
  return found
}

const indent = (depth: number): string => '  '.repeat(depth)

function group(attributes: string, children: readonly string[], depth: number): string {
  return [`${indent(depth)}<g ${attributes}>`, ...children, `${indent(depth)}</g>`].join('\n')
}

/** One layer of a picture: a named group, holding one group per colour. Nothing at all if the layer is empty. */
function layer(naming: 'id' | 'class', name: string, grid: Grid, depth = 1): string[] {
  const colours = TONES.flatMap((tone) => {
    const found = rectangles(grid, tone)
    if (found.length === 0) return []
    const paint: Paint = PALETTE[tone]
    const fill = paint.opacity === undefined ? `fill="${paint.fill}"` : `fill="${paint.fill}" fill-opacity="${paint.opacity}"`
    const rects = found.map(({ x, y, width, height }) => `${indent(depth + 2)}<rect x="${x}" y="${y}" width="${width}" height="${height}"/>`)
    return [group(fill, rects, depth + 1)]
  })
  return colours.length === 0 ? [] : [group(`${naming}="${name}"`, colours, depth)]
}

interface Picture {
  title: string
  /** The part of the drawing the picture shows. */
  view: Area
  /** Screen pixels per unit when the file is opened by itself. */
  scale?: number
  style?: string
  parts: readonly string[]
}

function svg({ title, view, scale = 1, style, parts }: Picture): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" width="${view.width * scale}" height="${view.height * scale}" shape-rendering="crispEdges">`,
    `  <title>${title}</title>`,
    '  <!-- Written by scripts/assets/draw-den.ts: change the drawing there. Rectangles on whole coordinates;',
    '       one unit is one pixel of the plain the den stands on. Nothing is drawn behind it. -->',
    ...(style ? [style] : []),
    ...parts,
    '</svg>',
    '',
  ].join('\n')
}

// --- The pictures ----------------------------------------------------------------------------------------------------

const behind = paintRocks('behind')
const front = paintRocks('front')
/** What the light adds on the rocks in front: its fall on their tops, and its edge on their outline. */
const frontGlow = under(front.glow, rimOf(front.rocks))
const pitByDay = paintBands(DEN, LIGHT_FOOT, PIT_BY_DAY)
const pitLit = paintBands(DEN, LIGHT_FOOT, PIT_LIT)
const spill = paintBands(SPILL, SPILL_MIDDLE, SPILL_BANDS, 0.14)
const frameNumbers = Array.from({ length: FRAMES }, (_, frame) => frame)

/** The layers the title screen stacks, from the back: each a picture of its own, since the screen lights and darkens them apart. */
function sceneFiles(): Record<string, string> {
  const strip = frameNumbers.map((frame) => {
    const { light, streaks } = lightFrame(LIGHT_FRAME, frame)
    const shift = `transform="translate(${frame * LIGHT_FRAME.width - LIGHT_FRAME.left})"`
    return group(shift, [...layer('class', 'den-light', light, 2), ...layer('class', 'den-streaks', streaks, 2)], 1)
  })
  return {
    'den-spill.svg': svg({
      title: 'The den: its light on the ground',
      view: SPILL,
      parts: layer('id', 'den-spill', without(spill, pitByDay, behind.rocks, front.rocks)),
    }),
    'den-back.svg': svg({
      title: 'The den by day: its pit and the rocks behind its light',
      view: RING,
      parts: [...layer('id', 'den-pit', without(pitByDay, behind.rocks, front.rocks)), ...layer('id', 'den-rocks-behind', without(behind.rocks, front.rocks))],
    }),
    'den-back-glow.svg': svg({
      title: 'The den: what its light adds behind it',
      view: RING,
      parts: [...layer('id', 'den-pit-lit', without(pitLit, behind.rocks, front.rocks)), ...layer('id', 'den-glow-behind', without(behind.glow, front.rocks))],
    }),
    'den-front.svg': svg({ title: 'The den by day: the rocks in front of its light', view: RING, parts: layer('id', 'den-rocks-in-front', front.rocks) }),
    'den-front-glow.svg': svg({ title: 'The den: what its light adds in front of it', view: RING, parts: layer('id', 'den-glow-in-front', frontGlow) }),
    'den-light.svg': svg({
      title: `The den's light: the ${FRAMES} frames of its loop, side by side`,
      view: { left: 0, top: 0, width: LIGHT_FRAME.width * FRAMES, height: LIGHT_FRAME.height },
      parts: strip,
    }),
  }
}

/** How long a frame of the whole den's own loop lasts, in milliseconds. */
const FRAME_MS = 120

/** The whole den in one picture, lit. With several frames, it plays them in a loop by itself, and holds the first under reduced motion. */
function wholeDen(frames: readonly number[]): string {
  const lightArea: Area = { ...LIGHT_FRAME, height: LIGHT_END }
  const lightParts = (frame: number, naming: 'id' | 'class', depth: number): string[] => {
    const { light, streaks } = lightFrame(lightArea, frame)
    return [...layer(naming, 'den-light', without(light, front.rocks), depth), ...layer(naming, 'den-streaks', without(streaks, front.rocks), depth)]
  }
  const [only] = frames
  const moving =
    frames.length === 1 && only !== undefined
      ? lightParts(only, 'id', 1)
      : frames.map((frame, at) => group(`class="den-frame den-frame-${at + 1}"`, lightParts(frame, 'class', 2), 1))
  const delays = frames.slice(1).map((_, at) => `    .den-frame-${at + 2} { animation-delay: ${(at + 1) * FRAME_MS}ms; }`)
  const style = [
    '  <style>',
    `    .den-frame { opacity: 0; animation: den-frame ${frames.length * FRAME_MS}ms steps(1, end) infinite; }`,
    '    .den-frame-1 { opacity: 1; }',
    ...delays,
    `    @keyframes den-frame { 0% { opacity: 1; } ${100 / frames.length}%, 100% { opacity: 0; } }`,
    '    @media (prefers-reduced-motion: reduce) { .den-frame { animation: none; } }',
    '  </style>',
  ].join('\n')
  return svg({
    title: 'Den',
    view: DEN,
    scale: 4,
    style: frames.length > 1 ? style : undefined,
    parts: [
      ...layer('id', 'den-pit', without(pitLit, behind.rocks, front.rocks)),
      ...layer('id', 'den-rocks-behind', without(behind.rocks, front.rocks)),
      ...layer('id', 'den-glow-behind', without(behind.glow, front.rocks)),
      ...moving,
      ...layer('id', 'den-rocks-in-front', front.rocks),
      ...layer('id', 'den-glow-in-front', frontGlow),
    ],
  })
}

// --- What must hold --------------------------------------------------------------------------------------------------

/** The light is cut straight at its foot: the rocks in front must hide the cut, halo included. */
function checkLightFootIsHidden(): void {
  for (let x = LIGHT_LEFT - 2; x < LIGHT_RIGHT + 2; x++) {
    if (!toneAt(front.rocks, x, LIGHT_END - 1)) throw new Error(`The light's foot shows at column ${x}: no rock in front of it`)
  }
}

/** The title screen places each picture by numbers kept in the app: they must be this drawing's. */
function checkPlaces(): void {
  const at = { x: TITLE_DEN.back.x - RING.left, y: TITLE_DEN.back.y - RING.top }
  const wrong: string[] = []
  const expect = (what: string, has: number, wants: number): void => {
    if (has !== wants) wrong.push(`TITLE_DEN.${what} is ${has}, and the drawing needs ${wants}`)
  }
  const pictures = { spill: SPILL, back: RING, backGlow: RING, front: RING, frontGlow: RING } as const
  for (const [name, area] of Object.entries(pictures) as [keyof typeof pictures, Area][]) {
    expect(`${name}.x`, TITLE_DEN[name].x, at.x + area.left)
    expect(`${name}.y`, TITLE_DEN[name].y, at.y + area.top)
    expect(`${name}.width`, TITLE_DEN[name].width, area.width)
    expect(`${name}.height`, TITLE_DEN[name].height, area.height)
  }
  expect('light.x', TITLE_DEN.light.x, at.x + LIGHT_FRAME.left)
  expect('light.width', TITLE_DEN.light.width, LIGHT_FRAME.width)
  expect('light.height', TITLE_DEN.light.height, LIGHT_FRAME.height)
  expect('light.frames', TITLE_DEN.light.frames, FRAMES)
  expect('light.left', TITLE_DEN.light.left, at.x + LIGHT_LEFT)
  expect('light.right', TITLE_DEN.light.right, at.x + LIGHT_RIGHT)
  expect('light.foot', TITLE_DEN.light.foot, at.y + LIGHT_END)
  expect('middle.x', TITLE_DEN.middle.x, at.x + LIGHT_FOOT.x)
  expect('middle.y', TITLE_DEN.middle.y, at.y + LIGHT_FOOT.y)
  if (wrong.length > 0) throw new Error(`src/data/sprites.ts and the drawing disagree:\n${wrong.join('\n')}`)
}

// --- Writing ---------------------------------------------------------------------------------------------------------

function write(folder: string, name: string, text: string): void {
  writeFileSync(join(folder, name), text)
  console.log(`${name}: ${text.split('<rect').length - 1} rectangles, ${text.length} bytes`)
}

checkLightFootIsHidden()
checkPlaces()
for (const [name, text] of Object.entries(sceneFiles())) write(join(ROOT, 'public'), name, text)

const wholeAt = process.argv.indexOf('--whole')
const wholeFolder = wholeAt === -1 ? undefined : process.argv[wholeAt + 1]
if (wholeAt !== -1 && !wholeFolder) throw new Error('--whole needs the folder to write den.svg and den-animated.svg in')
if (wholeFolder) {
  write(wholeFolder, 'den.svg', wholeDen([0]))
  write(wholeFolder, 'den-animated.svg', wholeDen(frameNumbers))
}
