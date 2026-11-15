/**
 * The documents kept on this device: characters, campaigns, and the
 * invitations a player has opened (a campaign's rules, to create from).
 *
 * The browser's storage is a convenience copy, not a safe: it can be cleared
 * or evicted, and it is small. So nothing here hides a failure. A write that
 * does not fit says so, for the screen to offer the file instead; an entry
 * that cannot be read is listed as such with its raw text, never dropped.
 */
import { type CodeResult, type Invitation, type SpeciesIndex, decodeCreationCode, encodeCreationCode } from '../shared/codec/codes.ts'
import { type CampaignDocument, readCampaign } from '../shared/schema/campaign.ts'
import { type CharacterDocument, readCharacter } from '../shared/schema/character.ts'
import type { ReadResult } from '../shared/schema/common.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'

/** The part of the browser's `Storage` the library needs; a test passes its own. */
export interface KeyValue {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A storage that lasts as long as the page: what the app falls back on when
 * the browser refuses its own, so that a visit still works, with a warning.
 */
export function memoryStorage(): KeyValue {
  const entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  }
}

/** `full`: the storage has no room left. `blocked`: the browser refuses access to it (private mode, site data disabled). */
export type WriteResult = { ok: true } | { ok: false; reason: 'full' | 'blocked' }

export interface Stored<T> {
  id: string
  read: ReadResult<T>
  /** The entry as stored, so that even an unreadable one can be exported. */
  raw: string
}

const CHARACTERS = 'denborn/character/'
const CAMPAIGNS = 'denborn/campaign/'
const INVITATIONS = 'denborn/invitation/'

function isQuotaError(error: unknown): boolean {
  // Browsers name it differently; the two numeric codes are the legacy ones.
  return error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || ('code' in error && (error.code === 22 || error.code === 1014)))
}

export interface Library {
  characters(): Stored<CharacterDocument>[]
  saveCharacter(character: CharacterDocument): WriteResult
  removeCharacter(id: string): void

  campaigns(): Stored<CampaignDocument>[]
  saveCampaign(campaign: CampaignDocument): WriteResult
  removeCampaign(id: string): void

  /** The invitations opened on this device, newest rules version of each campaign last. */
  invitations(species: SpeciesIndex): CodeResult<Invitation>[]
  saveInvitation(invitation: Invitation, species: SpeciesIndex): WriteResult
  /** The rules of one version of a campaign: from the campaign itself when this device keeps it, otherwise from an invitation opened here. */
  rulesOf(campaignId: string, version: number, species: SpeciesIndex): CampaignRules | undefined
}

export function openLibrary(storage: KeyValue): Library {
  const keys = (prefix: string): string[] => {
    const found: string[] = []
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index)
      if (key?.startsWith(prefix)) found.push(key)
    }
    return found.sort()
  }

  const write = (key: string, text: string): WriteResult => {
    try {
      storage.setItem(key, text)
      return { ok: true }
    } catch (error) {
      return { ok: false, reason: isQuotaError(error) ? 'full' : 'blocked' }
    }
  }

  function list<T>(prefix: string, read: (input: unknown) => ReadResult<T>): Stored<T>[] {
    return keys(prefix).map((key) => {
      const raw = storage.getItem(key) ?? ''
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Not JSON any more: reported below as "not this kind", with the raw text kept.
        parsed = undefined
      }
      return { id: key.slice(prefix.length), read: read(parsed), raw }
    })
  }

  return {
    characters: () => list(CHARACTERS, readCharacter),
    saveCharacter: (character) => write(CHARACTERS + character.id, JSON.stringify(character)),
    removeCharacter: (id) => storage.removeItem(CHARACTERS + id),

    campaigns: () => list(CAMPAIGNS, readCampaign),
    saveCampaign: (campaign) => write(CAMPAIGNS + campaign.id, JSON.stringify(campaign)),
    removeCampaign: (id) => storage.removeItem(CAMPAIGNS + id),

    // An invitation is kept as the very code it came as: one format to read, already bounded and checked.
    invitations: (species) => keys(INVITATIONS).map((key) => decodeCreationCode(storage.getItem(key) ?? '', species)),
    saveInvitation: (invitation, species) =>
      write(`${INVITATIONS}${invitation.campaign.id}/${String(invitation.rules.version).padStart(4, '0')}`, encodeCreationCode(invitation, species)),
    rulesOf: (campaignId, version, species) => {
      // A game master's own campaign is the source of its rules: its history comes before any link opened here.
      const own = list(CAMPAIGNS, readCampaign).find((entry) => entry.id === campaignId)
      const kept = own?.read.ok ? own.read.value.rulesHistory.find((rules) => rules.version === version) : undefined
      if (kept) return kept
      const code = storage.getItem(`${INVITATIONS}${campaignId}/${String(version).padStart(4, '0')}`)
      const decoded = code === null ? undefined : decodeCreationCode(code, species)
      return decoded?.ok ? decoded.value.rules : undefined
    },
  }
}
