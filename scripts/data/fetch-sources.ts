/**
 * Downloads the pinned PokéAPI tables into the cache and checks them.
 *
 *   node scripts/data/fetch-sources.ts          check against the lock (what a build does)
 *   node scripts/data/fetch-sources.ts --pin    record the checksums of a newly adopted version
 */
import { TABLES, ensurePokeapi } from './lib/pokeapi.ts'

const lock = await ensurePokeapi(process.argv.includes('--pin'))
console.log(`PokéAPI ${lock.commit.slice(0, 7)} (${lock.committedAt.slice(0, 10)}): ${TABLES.length} tables ready`)
