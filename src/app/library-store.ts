/**
 * What this device keeps, as the screens see it: the library over the
 * browser's storage, with a count that moves at every write so that the
 * screens showing it are redrawn.
 */
import { create } from 'zustand'
import type { Invitation, SpeciesIndex } from '../shared/codec/codes'
import type { CampaignDocument } from '../shared/schema/campaign'
import type { CharacterDocument } from '../shared/schema/character'
import type { CampaignRules } from '../shared/schema/rules'
import { browserStorage } from '../storage/browser'
import { type Stored, type WriteResult, memoryStorage, openLibrary } from '../storage/library'

const storage = browserStorage()
const library = openLibrary(storage ?? memoryStorage())

interface LibraryState {
  /** False when the browser refuses its storage: what is saved lasts only as long as the page. */
  kept: boolean
  /** One more at every write. */
  writes: number
  characters: () => Stored<CharacterDocument>[]
  saveCharacter: (character: CharacterDocument) => WriteResult
  /** Takes a character off this device, for good. */
  removeCharacter: (id: string) => void
  /** The campaigns this device keeps as their game master. */
  campaigns: () => Stored<CampaignDocument>[]
  saveCampaign: (campaign: CampaignDocument) => WriteResult
  /** The campaigns a character can be made for here: this device's own, and those whose creation link was opened, each with its newest rules. */
  invitations: (species: SpeciesIndex) => Invitation[]
  saveInvitation: (invitation: Invitation, species: SpeciesIndex) => WriteResult
  /** The rules of one version of a campaign, when this device was given them. */
  rulesOf: (campaignId: string, version: number, species: SpeciesIndex) => CampaignRules | undefined
}

export const useLibrary = create<LibraryState>((set) => {
  const written = (result: WriteResult): WriteResult => {
    if (result.ok) set((state) => ({ writes: state.writes + 1 }))
    return result
  }
  return {
    kept: storage !== undefined,
    writes: 0,
    characters: () => library.characters(),
    campaigns: () => library.campaigns(),
    saveCampaign: (campaign) => written(library.saveCampaign(campaign)),
    saveCharacter: (character) => written(library.saveCharacter(character)),
    removeCharacter: (id) => {
      library.removeCharacter(id)
      written({ ok: true })
    },
    invitations: (species) => {
      const newest = new Map<string, Invitation>()
      // Listed oldest version first: the last one seen for a campaign is its newest.
      for (const entry of library.invitations(species)) if (entry.ok) newest.set(entry.value.campaign.id, entry.value)
      // A campaign kept here speaks for itself: its rules in force come before any link opened earlier.
      for (const entry of library.campaigns()) {
        const rules = entry.read.ok ? entry.read.value.rulesHistory.at(-1) : undefined
        if (entry.read.ok && rules) newest.set(entry.id, { campaign: { id: entry.id, name: entry.read.value.name }, dataPackVersion: entry.read.value.dataPackVersion, rules })
      }
      return [...newest.values()]
    },
    saveInvitation: (invitation, species) => written(library.saveInvitation(invitation, species)),
    rulesOf: (campaignId, version, species) => library.rulesOf(campaignId, version, species),
  }
})
