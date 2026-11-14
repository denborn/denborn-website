/**
 * Measures how long Denborn's codes are for realistic campaigns and
 * characters, and how large a QR code each one needs. It reads the real data
 * pack, so run `pnpm data` first:
 *
 *   node scripts/measure/code-sizes.ts
 *
 * It is a measurement, not a test: its numbers go to DECISIONS.md and to the
 * owner, who decides how large a QR code may be.
 */
import { readFileSync } from 'node:fs'
import { correction, generate } from 'lean-qr'
import type { DataPack } from '../../src/data/types.ts'
import { SAMPLE_CAMPAIGN, sampleCharacter, sampleRules } from '../../src/domain/samples.ts'
import { encodeCharacterCode, encodeCreationCode, qrForm } from '../../src/shared/codec/codes.ts'
import type { CampaignRules } from '../../src/shared/schema/rules.ts'

const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack
const ORIGIN = 'https://denborn-website.kori-san.workers.dev'

/** Side of the smallest QR code that holds the text, in modules, at the lowest error correction; nothing when none can. */
function qrSide(text: string): number | undefined {
  try {
    return generate(text, { minCorrectionLevel: correction.L }).size
  } catch {
    return undefined
  }
}

function row(label: string, code: string): string {
  const cell = (value: number | undefined): string => (value === undefined ? 'too large' : `${value} × ${value}`)
  return `| ${label} | ${code.length} | ${`${ORIGIN}/#${code}`.length} | ${cell(qrSide(qrForm(code)))} | ${cell(qrSide(qrForm(code, ORIGIN)))} | ${cell(qrSide(code))} |`
}

const invite = (rules: CampaignRules): string => encodeCreationCode({ campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules }, pack.species)
const bagKinds = Object.values(pack.items).filter((item) => item.bag).length
const HEAD = '| Characters, code | Characters, link | QR, code | QR, link | QR, without capitals |\n|---|---|---|---|---|---|'

console.log(`Data pack ${pack.version}\n`)
console.log(`| Character ${HEAD}`)
console.log(row('Just created: level 5, 2 moves, 4 kinds of item', encodeCharacterCode(sampleCharacter(pack, 5, 'Volt', 2, 4))))
console.log(row('Played: level 50, 24-letter name, 6 moves, 12 kinds of item', encodeCharacterCode(sampleCharacter(pack, 50, 'Éclair-de-Lune du Matin.', 6, 12))))
console.log(row('Long campaign: level 100, 6 moves, 30 kinds of item', encodeCharacterCode(sampleCharacter(pack, 100, 'Éclair-de-Lune du Matin.', 6, 30))))
console.log(row(`Hoarder: level 100, 6 moves, every Bag item (${bagKinds} kinds)`, encodeCharacterCode(sampleCharacter(pack, 100, 'Éclair-de-Lune du Matin.', 6, bagKinds))))
console.log(`\n| Campaign rules ${HEAD}`)
console.log(row('All 151 species, no common move, 1 pack of 5 items', invite(sampleRules(pack, 0, 1, 5))))
console.log(row('All 151 species, 10 common moves, 3 packs of 8 items', invite(sampleRules(pack, 10, 3, 8))))
console.log(row('60 species, 40 common moves, 6 packs of 12 items', invite(sampleRules(pack, 40, 6, 12, 60))))
console.log(row('All 151 species, 200 common moves, 10 packs of 20 items', invite(sampleRules(pack, 200, 10, 20))))
