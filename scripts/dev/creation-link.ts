/**
 * Prints a creation link for a test campaign, to make characters in the app
 * before the game master's campaign screens exist. Those screens will make
 * the real links; this file goes away with them. It reads the real data
 * pack, so run `pnpm data` first:
 *
 *   node scripts/dev/creation-link.ts            characters start at level 5
 *   node scripts/dev/creation-link.ts 30         characters start at level 30
 *   node scripts/dev/creation-link.ts 30 https://denborn-website.kori-san.workers.dev
 *
 * The campaign is a sample, not a ruling: all 151 species, 3000 Pokédollars,
 * natures chosen, every way to learn a move, two item packs of four items.
 */
import { readFileSync } from 'node:fs'
import type { DataPack } from '../../src/data/types.ts'
import { sampleRules } from '../../src/domain/samples.ts'
import { MAX_LEVEL } from '../../src/game-rules/exp.ts'
import { encodeCreationCode } from '../../src/shared/codec/codes.ts'

const [levelGiven = '5', origin = 'http://localhost:5173'] = process.argv.slice(2)
const startingLevel = Number(levelGiven)
if (!Number.isInteger(startingLevel) || startingLevel < 1 || startingLevel > MAX_LEVEL) {
  console.error(`The starting level must be a whole number from 1 to ${MAX_LEVEL}; got "${levelGiven}".`)
  process.exit(1)
}

const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack
// One campaign per starting level: a device keeps one set of rules per campaign and version,
// and characters made under one level would not pass the rules of another.
const campaign = { id: `devCampaignLv${String(startingLevel).padStart(3, '0')}`, name: `Test campaign (Lv. ${startingLevel})` }
const code = encodeCreationCode({ campaign, dataPackVersion: pack.version, rules: { ...sampleRules(pack, 2, 2, 4), startingLevel } }, pack.species)

console.log(`${origin}/#${code}`)
