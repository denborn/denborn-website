/**
 * Downloads the pinned sources (PokéAPI's tables, the games' battle messages) into the cache and checks them.
 *
 *   node scripts/data/fetch-sources.ts          check against the lock (what a build does)
 *   node scripts/data/fetch-sources.ts --pin    record the checksums of a newly adopted version
 */
import { ensureBattleText } from './lib/battle-text.ts'
import { TABLES, ensurePokeapi } from './lib/pokeapi.ts'

const pin = process.argv.includes('--pin')
const lock = await ensurePokeapi(pin)
const texts = await ensureBattleText(pin)
console.log(`PokéAPI ${lock.commit.slice(0, 7)} (${lock.committedAt.slice(0, 10)}): ${TABLES.length} tables ready`)
console.log(`Battle messages: ${texts.repository} ${texts.commit.slice(0, 7)} (${texts.committedAt.slice(0, 10)}) ready`)
