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
 * The battle sprite of a species: Gen 5 animated when Showdown has it, its
 * "ani" set otherwise. Returns nothing when the species has no sprite at all;
 * the interface then shows its name.
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
