/**
 * Denborn's files: a character or a campaign as JSON, the copy that outlives
 * the browser's storage (spec section 5).
 *
 * A character's file carries the rules it was made under, so that the file
 * alone is enough to check it on any device.
 */
import { type CampaignDocument, readCampaign } from '../shared/schema/campaign.ts'
import { type CharacterDocument, readCharacter } from '../shared/schema/character.ts'
import type { ReadResult } from '../shared/schema/common.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'

/** Largest file read, in characters: far more than any campaign needs, far less than could hurt. */
export const MAX_FILE_LENGTH = 5_000_000

export interface FileToSave {
  name: string
  text: string
}

/** A name made safe and plain for a file name: accents dropped, anything else that is not a letter or a digit becomes a hyphen. */
export function fileSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function characterFile(character: CharacterDocument, rules: CampaignRules): FileToSave {
  const document: CharacterDocument = { ...character, rules }
  return { name: `denborn-${fileSlug(character.nickname) || character.id}.json`, text: JSON.stringify(document, null, 2) }
}

/**
 * A kept character exactly as it is stored: the way out for one this app
 * cannot read, or no longer accepts, so that nothing kept is ever stuck here.
 */
export function storedCharacterFile(entry: { id: string; raw: string; read: ReadResult<CharacterDocument> }): FileToSave {
  const name = entry.read.ok ? fileSlug(entry.read.value.nickname) : ''
  return { name: `denborn-${name || entry.id}.json`, text: entry.raw }
}

/** A kept campaign exactly as it is stored: the way out for one this app cannot read. */
export function storedCampaignFile(entry: { id: string; raw: string; read: ReadResult<CampaignDocument> }): FileToSave {
  const name = entry.read.ok ? fileSlug(entry.read.value.name) : ''
  return { name: `denborn-campaign-${name || entry.id}.json`, text: entry.raw }
}

export function campaignFile(campaign: CampaignDocument): FileToSave {
  return { name: `denborn-campaign-${fileSlug(campaign.name) || campaign.id}.json`, text: JSON.stringify(campaign, null, 2) }
}

export type OpenedFile =
  | { kind: 'character'; read: ReadResult<CharacterDocument> }
  | { kind: 'campaign'; read: ReadResult<CampaignDocument> }
  /** Too long to be one of Denborn's files, not JSON, or JSON of something else. */
  | { kind: 'unknown'; reason: 'too-large' | 'not-json' | 'not-denborn' }

/** Reads a file's text as whichever Denborn document it says it is. */
export function openFile(text: string): OpenedFile {
  if (text.length > MAX_FILE_LENGTH) return { kind: 'unknown', reason: 'too-large' }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { kind: 'unknown', reason: 'not-json' }
  }
  const character = readCharacter(parsed)
  if (character.ok || character.reason !== 'not-this-kind') return { kind: 'character', read: character }
  const campaign = readCampaign(parsed)
  if (campaign.ok || campaign.reason !== 'not-this-kind') return { kind: 'campaign', read: campaign }
  return { kind: 'unknown', reason: 'not-denborn' }
}
