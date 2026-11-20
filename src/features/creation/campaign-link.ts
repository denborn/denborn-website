/**
 * A campaign brought to this device to create a character for (decision
 * 289): by a creation link pasted, or by its QR code read with the camera.
 * Pure: the page keeps what this reads.
 */
import { type Invitation, type SpeciesIndex, decodeCharacterCode, decodeCreationCode } from '../../shared/codec/codes.ts'
import { joinCodeIn } from '../../shared/protocol/room-code.ts'
import { plain } from '../../shared/text/plain.ts'

/**
 * Why a text is not a campaign to create for. `character` and `join`: it is
 * another of the app's codes, a character's own or a session's, which open
 * elsewhere. The others are a creation link's own troubles.
 */
export type CampaignLinkProblem = 'not-this-kind' | 'newer-version' | 'damaged' | 'unknown-species' | 'character' | 'join'

export type CampaignLinkRead = { ok: true; invitation: Invitation } | { ok: false; problem: CampaignLinkProblem }

/** Reads a pasted or scanned text: a creation code, alone or at the end of a link. */
export function readCampaignLink(text: string, species: SpeciesIndex): CampaignLinkRead {
  const decoded = decodeCreationCode(text, species)
  if (decoded.ok) return { ok: true, invitation: decoded.value }
  if (decoded.reason !== 'not-this-kind') return { ok: false, problem: decoded.reason }
  // The other codes a player is sent: say which one it is, rather than "not a creation link".
  const character = decodeCharacterCode(text)
  if (character.ok || character.reason !== 'not-this-kind') return { ok: false, problem: 'character' }
  return { ok: false, problem: joinCodeIn(text) === undefined ? 'not-this-kind' : 'join' }
}

/** The campaigns to choose from, by name, accents and capitals set aside; two of one name keep one order by their ids. */
export function campaignsOffered(invitations: readonly Invitation[]): Invitation[] {
  return [...invitations].sort((a, b) => plain(a.campaign.name).localeCompare(plain(b.campaign.name)) || a.campaign.id.localeCompare(b.campaign.id))
}
