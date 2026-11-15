/**
 * What the sheet's page shows for one of this device's characters: its sheet,
 * or why there is none to show.
 *
 * A character kept here passes the same checks as one that comes from outside
 * before its sheet is drawn: the browser's storage is no safe, and the app's
 * game data may have changed since the character was saved.
 */
import type { DataPack } from '../../data/types.ts'
import { openCharacter } from '../../domain/open-character.ts'
import { type SheetNumbers, sheetNumbers } from '../../domain/sheet.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import type { CampaignRules } from '../../shared/schema/rules.ts'
import type { Stored } from '../../storage/library.ts'

export type SheetProblem =
  /** This device keeps no character under that id. */
  | 'missing'
  /** Kept, but not in a form this app reads. */
  | 'unreadable'
  /** Kept by a newer version of the app. */
  | 'newer'
  /** It carries no rules, and this device has none for its campaign and version. */
  | 'rulesUnknown'
  /** It, or its rules, do not pass the checks against this app's game data. */
  | 'invalid'

export type SheetToShow =
  | {
      show: 'sheet'
      character: CharacterDocument
      /** The rules it was checked under: this device's own when it has them, otherwise the ones kept with it. */
      rules: CampaignRules
      numbers: SheetNumbers
      /** True when it was saved with other game data than this app's: the sheet says so. */
      otherGameData: boolean
    }
  | { show: 'problem'; problem: SheetProblem }

const problem = (reason: SheetProblem): SheetToShow => ({ show: 'problem', problem: reason })

/** `rulesOf` gives the rules this device has for a campaign and version, if any. */
export function sheetToShow(
  entry: Stored<CharacterDocument> | undefined,
  rulesOf: (campaign: CharacterDocument['campaign']) => CampaignRules | undefined,
  pack: DataPack,
): SheetToShow {
  if (!entry) return problem('missing')
  if (!entry.read.ok) return problem(entry.read.reason === 'newer-version' ? 'newer' : 'unreadable')
  const opened = openCharacter(entry.read.value, rulesOf(entry.read.value.campaign), pack)
  if (!opened.ok) return problem(opened.reason === 'rules-unknown' ? 'rulesUnknown' : 'invalid')
  const numbers = sheetNumbers(opened.character, pack)
  // A character that passed its checks names only what the game data has, so its numbers can be worked out.
  if (!numbers) return problem('invalid')
  return { show: 'sheet', character: opened.character, rules: opened.rules, numbers, otherGameData: opened.otherGameData }
}
