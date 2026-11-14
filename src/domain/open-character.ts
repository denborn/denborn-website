/**
 * Taking in a character that comes from outside: a file, a code, a QR code.
 *
 * Whatever its way in, it must pass the same checks as a character made here,
 * against the rules it names and this app's game data, before anything else
 * uses it.
 */
import type { DataPack } from '../data/types.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { type CharacterProblem, checkCharacter } from './character-check.ts'
import { type RulesProblem, checkRules } from './rules-check.ts'

export type OpenedCharacter =
  | {
      ok: true
      character: CharacterDocument
      rules: CampaignRules
      /** True when it was saved with other game data than this app's: the screen must say so. */
      otherGameData: boolean
    }
  /** No rules came with it and none are known here for its campaign and version. */
  | { ok: false; reason: 'rules-unknown'; campaign: CharacterDocument['campaign'] }
  /** Its rules name things this app's game data does not have. */
  | { ok: false; reason: 'rules-invalid'; problems: RulesProblem[] }
  | { ok: false; reason: 'character-invalid'; problems: CharacterProblem[] }

/**
 * Checks a character read from a file or a code. `knownRules` are the rules
 * this device already has for its campaign and version, if any: the GM's own
 * history, or an invitation opened earlier. They come first. A file's own
 * copy of the rules is used only when the device knows none: otherwise a
 * file could bring rules rewritten to excuse what it holds.
 */
export function openCharacter(character: CharacterDocument, knownRules: CampaignRules | undefined, pack: DataPack): OpenedCharacter {
  const rules = knownRules ?? character.rules
  if (!rules) return { ok: false, reason: 'rules-unknown', campaign: character.campaign }
  const rulesProblems = checkRules(rules, pack)
  if (rulesProblems.length > 0) return { ok: false, reason: 'rules-invalid', problems: rulesProblems }
  const problems = checkCharacter(character, rules, pack)
  if (problems.length > 0) return { ok: false, reason: 'character-invalid', problems }
  return { ok: true, character, rules, otherGameData: character.dataPackVersion !== pack.version }
}
