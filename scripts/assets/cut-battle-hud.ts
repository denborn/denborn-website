/**
 * Cuts the pieces of Black and White's battle screens that the app draws a
 * fight with (decisions 255 and 256) out of the sheet the owner supplied, and
 * writes them as the two pictures the repository keeps:
 *
 *   public/battle-touch.png   the two halves of the touch screen's ball
 *   public/battle-hud.png     its three tiles, the two HP plates and the battery marks
 *
 *   node scripts/assets/cut-battle-hud.ts
 *
 * The sheet is "Battle HUD", ripped by Ploaj from Pokémon Black and White
 * (The Spriters Resource); it is in tmp/, which is never committed, so this
 * is run by hand when the cut changes and is no part of a build. Where each
 * piece goes in the second picture is said by `BATTLE_HUD` in
 * src/data/sprites.ts, which the app reads too.
 *
 * The words the games drew into the pieces are taken out, since the app
 * writes its own in both languages: the tiles' BAG, RUN and POKéMON are
 * painted over with the tile's own dots, the plates' "HP" with its box, and
 * the stroke between the two HP numbers with its band.
 *
 * The ball is cut into its two halves (decision 259), each without the
 * ground the sheet shows between them: the screen paints that ground itself,
 * and moves the halves apart over it.
 */
import { join } from 'node:path'
import { BATTLE_HUD, BATTLE_TOUCH } from '../../src/data/sprites.ts'
import { ROOT } from '../data/lib/pinned.ts'
import { type Picture, type Rect, type Rgba, blank, cut, paste, pixelAt, readPng, sameColour, setPixel, writePng } from './lib/png.ts'

const SHEET = join(ROOT, 'tmp/DS _ DSi - Pokemon Black _ White - Miscellaneous - Battle HUD.png')

/** Where each piece is on the sheet. */
const FROM = {
  /** The ball is drawn as large as on a screen: this is the sheet's pixel at the screen's top left corner while the ball is shut. */
  ball: { x: 128, y: 155 },
  /** The first row of the ball's lower half: the sheet draws the upper one over its brown ground, the lower one over black. */
  ballLower: 256,
  tiles: {
    left: { x: 518, y: 219, width: 78, height: 60 },
    middle: { x: 608, y: 235, width: 76, height: 44 },
    right: { x: 696, y: 219, width: 78, height: 60 },
  },
  plates: {
    far: { x: 617, y: 30, width: 124, height: 9 },
    near: { x: 617, y: 51, width: 120, height: 14 },
  },
  battery: [
    { x: 528, y: 174, width: 8, height: 10 },
    { x: 537, y: 174, width: 8, height: 10 },
    { x: 546, y: 174, width: 8, height: 10 },
  ],
} satisfies { ball: { x: number; y: number }; ballLower: number; tiles: Record<keyof typeof BATTLE_HUD.tiles, Rect>; plates: Record<keyof typeof BATTLE_HUD.plates, Rect>; battery: Rect[] }

/** The sheet's own ground, behind every piece: it becomes nothing. */
const GROUND: Rgba = [0xbd, 0xbd, 0xe7, 255]
const NOTHING: Rgba = [0, 0, 0, 0]
/** A tile's dots repeat every so many pixels along a row. */
const DOTS_EVERY = 5
/** A tile's word is outlined this far around its coloured letters. */
const OUTLINE = 2
/** The darkest of a tile's rim: anything as light or lighter is rim, not dots. */
const RIM_FROM = 0x5a
/** The dark of a plate, behind "HP" and under the numbers. */
const PLATE_DARK: Rgba = [0x30, 0x30, 0x30, 255]

const isGrey = ([red, green, blue]: Rgba): boolean => red === green && green === blue

/** How far from the ground's colour a pixel may be, a channel, and still be ground: the sheet has a stray paler one beside a tile. */
const GROUND_WITHIN = 20

const isGround = (colour: Rgba): boolean => colour.every((value, channel) => Math.abs(value - (GROUND[channel] ?? 0)) <= GROUND_WITHIN)

function withoutGround(piece: Picture): Picture {
  for (let y = 0; y < piece.height; y++) for (let x = 0; x < piece.width; x++) if (isGround(pixelAt(piece, x, y))) setPixel(piece, x, y, NOTHING)
  return piece
}

/**
 * A tile with its word painted over. The word is the only thing on a tile
 * that is not grey; with its outline it fills a rectangle of the dots, and
 * each pixel of that rectangle is given the dot that is in step with it on
 * its own row, outside the rectangle.
 */
function withoutWord(tile: Picture, name: string): Picture {
  const coloured: { x: number; y: number }[] = []
  for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) if (pixelAt(tile, x, y)[3] !== 0 && !isGrey(pixelAt(tile, x, y))) coloured.push({ x, y })
  if (coloured.length === 0) throw new Error(`The ${name} tile has no word on it: has the sheet changed?`)
  const word = {
    left: Math.min(...coloured.map((at) => at.x)) - OUTLINE,
    right: Math.max(...coloured.map((at) => at.x)) + OUTLINE,
    top: Math.min(...coloured.map((at) => at.y)) - OUTLINE,
    bottom: Math.max(...coloured.map((at) => at.y)) + OUTLINE,
  }
  const isDot = (x: number, y: number): boolean => {
    const colour = pixelAt(tile, x, y)
    return colour[3] !== 0 && isGrey(colour) && colour[0] < RIM_FROM && (x < word.left || x > word.right)
  }
  for (let y = word.top; y <= word.bottom; y++) {
    for (let x = word.left; x <= word.right; x++) {
      const inStep = Array.from({ length: tile.width }, (_, other) => other).filter((other) => (other - x) % DOTS_EVERY === 0 && isDot(other, y))
      const [nearest] = inStep.sort((a, b) => Math.abs(a - x) - Math.abs(b - x))
      if (nearest === undefined) throw new Error(`The ${name} tile has no dot in step with column ${x} on row ${y}`)
      setPixel(tile, x, y, pixelAt(tile, nearest, y))
    }
  }
  return tile
}

/** A plate with "HP" painted over with its own box, and anything white on its dark rows with their dark. */
function withoutWords(plate: Picture, spec: { hp: { x: number; width: number }; numbers?: { y: number; height: number } }): Picture {
  for (let y = 0; y < plate.height; y++) {
    for (let x = spec.hp.x; x < spec.hp.x + spec.hp.width; x++) {
      const [red, green, blue, alpha] = pixelAt(plate, x, y)
      // The letters are the green of a full HP bar: nothing else in the box is.
      if (alpha !== 0 && green > red + 40 && green > blue + 40) setPixel(plate, x, y, PLATE_DARK)
    }
  }
  if (spec.numbers) {
    for (let y = spec.numbers.y; y < spec.numbers.y + spec.numbers.height; y++) {
      for (let x = 0; x < plate.width; x++) if (sameColour(pixelAt(plate, x, y), [255, 255, 255, 255])) setPixel(plate, x, y, PLATE_DARK)
    }
  }
  return plate
}

/** The brown the sheet shows around the ball's upper half and in the belt over its middle row, in its two shades. */
const BALL_GROUND: readonly Rgba[] = [
  [0x42, 0x31, 0x31, 255],
  [0x4a, 0x39, 0x39, 255],
]
const BLACK: Rgba = [0, 0, 0, 255]

/**
 * The ball's upper half, as wide as a screen: everything over the ball's
 * middle row but the brown ground. Its red, the black line under it and the
 * shade that line casts stay.
 */
function upperHalf(sheet: Picture, rows: { y: number; height: number; screen: number }): Picture {
  const from = FROM.ball.y + rows.screen
  if (from + rows.height !== FROM.ballLower) throw new Error('The ball\'s upper half does not end on the row over its lower half')
  const half = cut(sheet, { x: FROM.ball.x, y: from, width: BATTLE_TOUCH.width, height: rows.height })
  for (let y = 0; y < half.height; y++) for (let x = 0; x < half.width; x++) if (BALL_GROUND.some((ground) => sameColour(pixelAt(half, x, y), ground))) setPixel(half, x, y, NOTHING)
  return half
}

/**
 * The ball's lower half, as wide as a screen. The sheet draws it over black:
 * in each column, the black from the middle row down to the shade the half's
 * own line casts is ground, and becomes nothing.
 */
function lowerHalf(sheet: Picture, rows: { y: number; height: number; screen: number }): Picture {
  const from = FROM.ball.y + rows.screen
  if (from !== FROM.ballLower) throw new Error('The ball\'s lower half does not start on its first row')
  const half = cut(sheet, { x: FROM.ball.x, y: from, width: BATTLE_TOUCH.width, height: rows.height })
  for (let x = 0; x < half.width; x++) {
    let y = 0
    while (y < half.height && sameColour(pixelAt(half, x, y), BLACK)) setPixel(half, x, y++, NOTHING)
    if (y === half.height) throw new Error(`The ball's lower half has nothing in column ${x}`)
  }
  return half
}

const sheet = await readPng(SHEET)

const ball = blank(BATTLE_TOUCH.width, BATTLE_TOUCH.height)
paste(ball, upperHalf(sheet, BATTLE_TOUCH.red), 0, BATTLE_TOUCH.red.y)
paste(ball, lowerHalf(sheet, BATTLE_TOUCH.white), 0, BATTLE_TOUCH.white.y)
await writePng(join(ROOT, 'public', BATTLE_TOUCH.url), ball)

const hud = blank(BATTLE_HUD.width, BATTLE_HUD.height)
const place = (piece: Picture, at: Rect, name: string): void => {
  if (piece.width !== at.width || piece.height !== at.height) throw new Error(`The ${name} is not the size src/data/sprites.ts says`)
  paste(hud, piece, at.x, at.y)
}
for (const name of ['left', 'middle', 'right'] as const) place(withoutWord(withoutGround(cut(sheet, FROM.tiles[name])), name), BATTLE_HUD.tiles[name], `${name} tile`)
for (const name of ['far', 'near'] as const) place(withoutWords(withoutGround(cut(sheet, FROM.plates[name])), BATTLE_HUD.plates[name]), BATTLE_HUD.plates[name], `${name} plate`)
FROM.battery.forEach((from, index) => {
  const at = BATTLE_HUD.battery[index]
  if (!at) throw new Error('src/data/sprites.ts places fewer battery marks than the sheet has')
  place(withoutGround(cut(sheet, from)), at, 'battery mark')
})
await writePng(join(ROOT, 'public', BATTLE_HUD.url), hud)

console.log(`Cut the ball's two halves (${ball.width} × ${ball.height}) and ${3 + 2 + FROM.battery.length} pieces (${hud.width} × ${hud.height}) from the sheet`)
