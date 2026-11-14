/** PokéAPI's data tables (CSV), at the version pinned in data-sources/pokeapi.lock.json. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseCsvRecords } from './csv.ts'
import { CACHE, ROOT, ensureFile, inBatches, readJson, writeJson } from './pinned.ts'

export const POKEAPI_LOCK = join(ROOT, 'data-sources/pokeapi.lock.json')

export interface PokeapiLock {
  repository: string
  commit: string
  committedAt: string
  path: string
  licence: string
  /** SHA-256 of each file, by file name. */
  files: Record<string, string>
}

/** The tables the data pack is built from. */
export const TABLES = [
  'languages',
  'version_groups',
  'items',
  'item_names',
  'item_prose',
  'item_flavor_text',
  'item_categories',
  'item_pockets',
  'pokemon',
  'pokemon_species',
  'pokemon_species_names',
  'pokemon_types',
  'pokemon_stats',
  'pokemon_abilities',
  'stats',
  'move_damage_classes',
  'moves',
  'move_names',
  'move_flavor_text',
  'abilities',
  'ability_names',
  'ability_flavor_text',
  'natures',
  'nature_names',
  'types',
  'type_names',
  'stat_names',
] as const

export type Table = (typeof TABLES)[number]

function cachePath(lock: PokeapiLock, table: Table): string {
  return join(CACHE, 'pokeapi', lock.commit, `${table}.csv`)
}

/**
 * Downloads the tables that are not in the cache yet and checks every one
 * against the lock. With `pin`, checksums missing from the lock are recorded
 * instead (used once, when a new PokéAPI version is adopted).
 */
export async function ensurePokeapi(pin = false): Promise<PokeapiLock> {
  const lock = await readJson<PokeapiLock>(POKEAPI_LOCK)
  const base = `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${lock.path}`
  const sums = await inBatches(TABLES, 4, async (table) => {
    const expected = lock.files[`${table}.csv`]
    if (expected === undefined && !pin) {
      throw new Error(`${table}.csv has no checksum in ${POKEAPI_LOCK}; run the script with --pin after reviewing the source`)
    }
    return ensureFile({ url: `${base}/${table}.csv`, path: cachePath(lock, table), sha256: expected })
  })
  if (pin) {
    lock.files = Object.fromEntries(TABLES.map((table, index) => [`${table}.csv`, sums[index] ?? '']))
    await writeJson(POKEAPI_LOCK, lock)
  }
  return lock
}

export type Row = Record<string, string>

export async function readTable(lock: PokeapiLock, table: Table): Promise<Row[]> {
  return parseCsvRecords(await readFile(cachePath(lock, table), 'utf8'))
}
