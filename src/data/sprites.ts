/**
 * Where each piece of artwork is served from. Every path comes from the data
 * pack, the sprite lock (data-sources/sprites.lock.json), the backdrop lock
 * (data-sources/backdrops.lock.json) or the app's own pictures in public/;
 * nothing is guessed from a name.
 */
import type { ItemIcon, SpeciesData } from './types'

const ROOT = '/sprites'

export interface BattleSpriteOptions {
  /** Seen from behind, for the player's side. */
  back?: boolean
  female?: boolean
}

/**
 * MissingNo., shown in the place of a Pokémon whose sprite is not there
 * (decisions 181 and 185): one the device has not fetched yet while it gets
 * ready to work offline, or one the artwork lacks. It is the one piece of
 * artwork kept in the repository, so it is served from the app's own root and
 * not from the downloaded sprites.
 */
export const MISSING_SPRITE_URL = '/missingno.gif'

/**
 * The battle sprite of a species: Gen 5 animated when Showdown has it, its
 * "ani" set otherwise. Returns nothing when the species has no sprite at all;
 * the interface then shows MissingNo. in its place.
 */
export function battleSpriteUrl(
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>,
  options: BattleSpriteOptions = {},
): string | undefined {
  if (!species.sprite) return undefined
  const folder = options.back ? `${species.sprite}-back` : species.sprite
  const suffix = options.female && species.femaleSprite ? '-f' : ''
  return `${ROOT}/${folder}/${species.id}${suffix}.gif`
}

/**
 * The app's own emblem: the pink grid ball (decision 212), rocking as a Poké
 * Ball shakes in the games, on a see-through ground. Its poses stand side by
 * side in one picture, each `width` by `height` pixels, wide enough for the
 * ball to roll five pixels either way: upright first, then three to the left,
 * then three to the right, each further over. `.dn-emblem` plays them.
 */
export const APP_EMBLEM = { url: '/emblem-frames.png', width: 42, height: 32, frames: 7 } as const

/** Where a picture stands in the title screen's scene, in the scene's own pixels. */
export interface ScenePlacement {
  url: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * The title screen's plain (decision 204): Showdown's meadow, served at three
 * times and a bit its own size; `width` and `height` are its own pixels, which
 * the scene takes it back to. `ground` is its first row of grass under the
 * fence: whoever walks on the plain (decision 225) keeps its feet from there down.
 */
export const TITLE_PLAIN = { url: `${ROOT}/fx/bg-meadow.png`, width: 238, height: 158, ground: 52 } as const

/** The plain's pixel at the top left corner of the den's drawing: far enough from the plain's edges for every phone to show the den in its middle. */
const DEN_AT = { x: 42, y: -3 }

/** A picture of the den: `left` and `top` are where it starts in the den's drawing. */
function denPicture(url: string, left: number, top: number, width: number, height: number): ScenePlacement {
  return { url, x: DEN_AT.x + left, y: DEN_AT.y + top, width, height }
}

/** A corner of the den's drawing, on the plain. */
function denCorner(left: number, top: number): { x: number; y: number } {
  return { x: DEN_AT.x + left, y: DEN_AT.y + top }
}

/**
 * The den on the title screen (decisions 202 and 210): a ring of flat rocks
 * round a pit, drawn on the plain's pixels and in its manner by
 * `scripts/assets/draw-den.ts`, which checks these numbers against its
 * drawing. It comes in layers, which the screen lights and darkens apart:
 * the rocks behind the light with the pit, and those in front of it, as they
 * are by day (`back`, `front`); what the light changes on each (`backGlow`,
 * `frontGlow`) and on the ground around (`spill`). Where a rock's foot stands
 * in grass, the pictures leave the plain to show.
 *
 * The light is a strip of `frames` frames side by side, each `width` wide and
 * `height` tall. Its top fades in squares, so it is hung from the top row the
 * screen shows and runs down to `foot`, the row where the rocks in front hide
 * its end; `height` is enough for the tallest screen. The columns `left` to
 * `right` are where it shines. `middle` is the middle of the ring, on the
 * ground: the column kept in the screen's middle, and where lightning strikes
 * the den.
 *
 * For whoever walks on the plain (decision 225): `footprint` is the ground the
 * rocks take, an outline with no dent that holds every one of their pixels,
 * its corners in order; `frontFoot` is the row the rocks in front stand on,
 * so that what stands lower is in front of them, and what stands above
 * `middle` is behind the rocks at the back.
 */
export const TITLE_DEN = {
  spill: denPicture('/den-spill.svg', -16, 92, 160, 70),
  back: denPicture('/den-back.svg', 0, 100, 128, 60),
  backGlow: denPicture('/den-back-glow.svg', 0, 100, 128, 60),
  front: denPicture('/den-front.svg', 0, 100, 128, 60),
  frontGlow: denPicture('/den-front-glow.svg', 0, 100, 128, 60),
  light: { url: '/den-light.svg', x: DEN_AT.x + 37, width: 54, height: 135, frames: 8, left: DEN_AT.x + 44, right: DEN_AT.x + 84, foot: DEN_AT.y + 127 },
  middle: { x: DEN_AT.x + 64, y: DEN_AT.y + 121 },
  footprint: [
    denCorner(4, 110),
    denCorner(50, 104),
    denCorner(72, 104),
    denCorner(116, 108),
    denCorner(126, 123),
    denCorner(126, 147),
    denCorner(118, 153),
    denCorner(80, 158),
    denCorner(53, 158),
    denCorner(8, 148),
    denCorner(3, 143),
    denCorner(3, 122),
  ],
  frontFoot: DEN_AT.y + 145,
} as const satisfies Record<'spill' | 'back' | 'backGlow' | 'front' | 'frontGlow', ScenePlacement> & {
  light: { url: string; x: number; width: number; height: number; frames: number; left: number; right: number; foot: number }
  middle: { x: number; y: number }
  footprint: readonly { x: number; y: number }[]
  frontFoot: number
}

/** Every battle sprite of the species given: seen from the front and from behind, and the female ones where there are. */
export function battleSpriteUrls(all: Iterable<Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>>): string[] {
  const urls: string[] = []
  for (const species of all) {
    for (const female of species.femaleSprite ? [false, true] : [false]) {
      for (const back of [false, true]) {
        const url = battleSpriteUrl(species, { back, female })
        if (url) urls.push(url)
      }
    }
  }
  return urls
}

export interface SheetCell {
  url: string
  /** Offset of the cell in the sheet, and its size, in the sheet's own pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Width of the whole image, needed to draw the cell at another size. */
  sheetWidth: number
}

/** A Pokémon's menu icon in Showdown's sheet: cells of 40×30, twelve per row, in Pokédex order. */
export function pokemonIconCell(num: number): SheetCell {
  return { url: `${ROOT}/pokemonicons-sheet.png`, x: (num % 12) * 40, y: Math.floor(num / 12) * 30, width: 40, height: 30, sheetWidth: 480 }
}

/**
 * An item's icon: a 24×24 cell of Showdown's sheet (sixteen per row), or
 * PokéAPI's own image for items Showdown lacks. PokéAPI's images are 30×30,
 * apart from a few larger ones that are drawn at that size all the same.
 */
export function itemIconCell(icon: ItemIcon): SheetCell {
  if (icon.from === 'pokeapi') {
    return { url: `${ROOT}/pokeapi/sprites/items/${icon.file}.png`, x: 0, y: 0, width: 30, height: 30, sheetWidth: 30 }
  }
  return { url: `${ROOT}/itemicons-sheet.png`, x: (icon.index % 16) * 24, y: Math.floor(icon.index / 16) * 24, width: 24, height: 24, sheetWidth: 384 }
}

/**
 * Showdown's move-category label, 32×14: a symbol in the middle of a coloured
 * band. `compact` keeps the middle 16 pixels, the symbol alone, for tight rows.
 */
export function categoryIconCell(category: 'Physical' | 'Special' | 'Status', compact = false): SheetCell {
  return { url: `${ROOT}/categories/${category}.png`, x: compact ? 8 : 0, y: 0, width: compact ? 16 : 32, height: 14, sheetWidth: 32 }
}
