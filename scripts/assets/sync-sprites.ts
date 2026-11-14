/**
 * Downloads the artwork the app shows into public/sprites/, which is never
 * committed: the artwork belongs to its rights holders (CREDITS.md).
 *
 * data-sources/sprites.lock.json lists every file with its source and SHA-256.
 *
 *   node scripts/assets/sync-sprites.ts          download what is missing and check everything against the lock
 *   node scripts/assets/sync-sprites.ts --pin    rebuild the lock from what the sources serve today
 *
 * Pokémon sprites, Pokémon icons, item icons, type and category icons come
 * from Pokémon Showdown. Icons of items Showdown does not have come from
 * PokéAPI's sprite repository, at a pinned commit.
 */
import { join } from 'node:path'
import { Dex } from '@pkmn/dex'
import { readBagTable } from '../data/lib/bag-table.ts'
import { NotFoundError, ROOT, ensureFile, inBatches, readJson, writeJson } from '../data/lib/pinned.ts'

const LOCK_PATH = join(ROOT, 'data-sources/sprites.lock.json')
const OUT = join(ROOT, 'public/sprites')
const SHOWDOWN = 'https://play.pokemonshowdown.com/sprites'
const LAST_SPECIES = 151

export interface SpriteLock {
  showdown: {
    base: string
    credit: string
    /** SHA-256 by path under the base URL. */
    files: Record<string, string>
  }
  pokeapi: {
    repository: string
    commit: string
    credit: string
    files: Record<string, string>
  }
}

const pin = process.argv.includes('--pin')
const lock = await readJson<SpriteLock>(LOCK_PATH)
const pokeapiBase = `https://raw.githubusercontent.com/${lock.pokeapi.repository}/${lock.pokeapi.commit}`

const speciesIds = Dex.species
  .all()
  .filter((entry) => entry.num >= 1 && entry.num <= LAST_SPECIES && !entry.forme)
  .map((entry) => entry.id)
const typeNames = Dex.types
  .all()
  .filter((type) => type.id !== 'stellar' && !type.isNonstandard)
  .map((type) => type.name)

/** Files that must exist. */
const required = [
  'pokemonicons-sheet.png',
  'itemicons-sheet.png',
  ...typeNames.map((name) => `types/${name}.png`),
  ...['Physical', 'Special', 'Status'].map((name) => `categories/${name}.png`),
]
/** A species' front and back sprite in one of Showdown's sets. */
const pair = (set: string, id: string, suffix = ''): [string, string] => [`${set}/${id}${suffix}.gif`, `${set}-back/${id}${suffix}.gif`]

const bagTable = await readBagTable()
const pokeapiItems = [...Object.keys(bagTable.effects), ...Object.keys(bagTable.ppUps), ...bagTable.evolution]
  // Items that are among Showdown's held items (the Berries) use its icon sheet instead.
  .filter((identifier) => {
    const item = Dex.items.get(identifier.replace(/-/g, ''))
    return !(item.exists && !item.isPokeball && !item.isNonstandard)
  })
  .map((identifier) => `sprites/items/${identifier}.png`)

async function fetchAll(base: string, paths: readonly string[], known: Record<string, string>, folder: string) {
  const found: Record<string, string> = {}
  const missing: string[] = []
  await inBatches(paths, 6, async (path) => {
    try {
      found[path] = await ensureFile({ url: `${base}/${path}`, path: join(OUT, folder, path), sha256: pin ? undefined : known[path] })
    } catch (error) {
      if (pin && error instanceof NotFoundError) missing.push(path)
      else throw error
    }
  })
  return { found, missing }
}

if (pin) {
  const needed = await fetchAll(SHOWDOWN, required, {}, '')
  if (needed.missing.length) throw new Error(`Showdown does not serve: ${needed.missing.join(', ')}`)
  // Battle sprites: Gen 5 animated first; Showdown's "ani" set for a species that has none (spec, section 6).
  const battleFiles: Record<string, string> = {}
  let withFemale = 0
  const fallbacks: string[] = []
  await inBatches(speciesIds, 6, async (id) => {
    let set = 'gen5ani'
    let sprites = await fetchAll(SHOWDOWN, pair(set, id), {}, '')
    if (sprites.missing.length) {
      set = 'ani'
      sprites = await fetchAll(SHOWDOWN, pair(set, id), {}, '')
      if (sprites.missing.length) throw new Error(`Showdown has no battle sprite for ${id}`)
      fallbacks.push(id)
    }
    Object.assign(battleFiles, sprites.found)
    // A female sprite is only used when both its front and its back exist.
    const female = await fetchAll(SHOWDOWN, pair(set, id, '-f'), {}, '')
    if (!female.missing.length) {
      Object.assign(battleFiles, female.found)
      withFemale++
    }
  })
  if (fallbacks.length) console.log(`Using the "ani" set for: ${fallbacks.join(', ')}`)
  const icons = await fetchAll(pokeapiBase, pokeapiItems, {}, 'pokeapi')
  if (icons.missing.length) console.warn(`PokéAPI has no icon for: ${icons.missing.join(', ')}`)
  lock.showdown.files = { ...needed.found, ...battleFiles }
  lock.pokeapi.files = icons.found
  await writeJson(LOCK_PATH, lock)
  console.log(
    `Pinned ${Object.keys(lock.showdown.files).length} Showdown files (${withFemale} species with a female sprite) and ${Object.keys(lock.pokeapi.files).length} PokéAPI icons`,
  )
} else {
  const absent = [...required, ...speciesIds.filter((id) => !pair('gen5ani', id).every((path) => path in lock.showdown.files) && !pair('ani', id).every((path) => path in lock.showdown.files)).map((id) => `a battle sprite for ${id}`)].filter((path) => path.startsWith('a battle') || !(path in lock.showdown.files))
  if (absent.length) throw new Error(`data-sources/sprites.lock.json lacks: ${absent.join(', ')}. Run with --pin after reviewing.`)
  await fetchAll(SHOWDOWN, Object.keys(lock.showdown.files), lock.showdown.files, '')
  await fetchAll(pokeapiBase, Object.keys(lock.pokeapi.files), lock.pokeapi.files, 'pokeapi')
  console.log(`Sprites ready: ${Object.keys(lock.showdown.files).length + Object.keys(lock.pokeapi.files).length} files checked against the lock`)
}
