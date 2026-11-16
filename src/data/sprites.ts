/**
 * Where each piece of artwork is served from. Every path comes from the data
 * pack and the sprite lock (data-sources/sprites.lock.json); nothing is
 * guessed from a name.
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
 * The app's own emblem: the den with its light, on the ground of the games'
 * icon. Its frames stand side by side in one picture, each a square of `side`
 * pixels; the first is the still icon.
 */
export const APP_EMBLEM = { url: '/icon-frames.png', side: 32, frames: 8 } as const

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
