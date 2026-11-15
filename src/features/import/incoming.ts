/**
 * A character coming in from outside: its file, or its code as a pasted link
 * or a scanned QR code. Whatever its way in, it is read, checked against its
 * rules like any other, and set against the copy this device may already
 * keep of it. Nothing here keeps it: the screen asks first (decision 107).
 */
import type { DataPack } from '../../data/types.ts'
import { openCharacter } from '../../domain/open-character.ts'
import { decodeCharacterCode, decodeCreationCode } from '../../shared/codec/codes.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignRules } from '../../shared/schema/rules.ts'
import { openFile } from '../../storage/files.ts'
import type { Stored } from '../../storage/library.ts'
import { type Standing, standingOf } from './standing.ts'

export type IncomingProblem =
  /** Neither a character's code nor a file of Denborn's. */
  | 'notACharacter'
  /** A creation link: it makes a new character, it is not one. */
  | 'creationLink'
  /** A campaign's file. */
  | 'campaignFile'
  /** A file larger than any of Denborn's. */
  | 'tooLarge'
  /** A code cut short or altered, or a character's file that is not well formed. */
  | 'damaged'
  /** Made by a newer version of the app. */
  | 'newer'
  /** It carries no rules, and this device has none for its campaign and version. */
  | 'rulesUnknown'
  /** It, or its rules, do not pass the checks against this app's game data. */
  | 'invalid'

export type { Standing }

export interface IncomingCharacter {
  ok: true
  character: CharacterDocument
  /** The rules it was checked under: this device's own when it has them, otherwise the ones it carries. */
  rules: CampaignRules
  /** True when it was saved with other game data than this app's. */
  otherGameData: boolean
  standing: Standing
  /** The copy kept here, when there is one that can be read. */
  kept?: CharacterDocument
}

export type Incoming = IncomingCharacter | { ok: false; problem: IncomingProblem }

/** What a reading needs to know of this device. */
export interface Device {
  pack: DataPack
  /** The characters kept here. */
  kept: readonly Stored<CharacterDocument>[]
  /** The rules this device has for a campaign and version, if any. */
  rulesOf: (campaign: CharacterDocument['campaign']) => CampaignRules | undefined
}

const problem = (reason: IncomingProblem): Incoming => ({ ok: false, problem: reason })

/** Reads the text of a file the user picked. */
export function readIncomingFile(text: string, device: Device): Incoming {
  const file = openFile(text)
  if (file.kind === 'campaign') return problem('campaignFile')
  if (file.kind === 'unknown') return problem(file.reason === 'too-large' ? 'tooLarge' : 'notACharacter')
  if (!file.read.ok) return problem(file.read.reason === 'newer-version' ? 'newer' : 'damaged')
  return judge(file.read.value, device)
}

/** Reads a pasted or scanned text: a character's code, alone or at the end of a link. */
export function readIncomingCode(text: string, device: Device): Incoming {
  const decoded = decodeCharacterCode(text)
  if (decoded.ok) return judge(decoded.value, device)
  if (decoded.reason !== 'not-this-kind') return problem(decoded.reason === 'newer-version' ? 'newer' : 'damaged')
  // The other code a player is sent is the creation link: say so rather than "not a character".
  const creation = decodeCreationCode(text, device.pack.species)
  return problem(creation.ok || creation.reason !== 'not-this-kind' ? 'creationLink' : 'notACharacter')
}

function judge(character: CharacterDocument, device: Device): Incoming {
  const opened = openCharacter(character, device.rulesOf(character.campaign), device.pack)
  if (!opened.ok) return problem(opened.reason === 'rules-unknown' ? 'rulesUnknown' : 'invalid')
  const entry = device.kept.find((stored) => stored.id === character.id)
  const kept = entry?.read.ok ? entry.read.value : undefined
  return {
    ok: true,
    character: opened.character,
    rules: opened.rules,
    otherGameData: opened.otherGameData,
    standing: standingOf(opened.character, entry, sameCharacter),
    ...(kept ? { kept } : {}),
  }
}

/** Whether two copies are the same character in every respect. The rules a copy may carry are not part of it: a code carries none. */
function sameCharacter(one: CharacterDocument, other: CharacterDocument): boolean {
  return sameValue(withoutRules(one), withoutRules(other))
}

function withoutRules(character: CharacterDocument): unknown {
  const bare: Partial<CharacterDocument> = { ...character }
  delete bare.rules
  return bare
}
