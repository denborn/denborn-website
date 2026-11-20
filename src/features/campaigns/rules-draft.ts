/**
 * A campaign's rules as the game master is setting them: what is chosen so
 * far, what must still be chosen before they can be saved, and the campaign
 * a save makes. Pure: the screens only show it and send changes.
 *
 * A save is the unit of change. One that changes any rule adds a version to
 * the campaign's history (kickoff prompt: "Changing any rule creates a new
 * rules version"); one that changes the name alone does not, since the name
 * is not a rule.
 */
import type { DataPack } from '../../data/types.ts'
import { type RulesProblem, checkRules } from '../../domain/rules-check.ts'
import type { MoveAccess } from '../../game-rules/eligibility.ts'
import { CAMPAIGN_KIND, CAMPAIGN_SCHEMA_VERSION, type CampaignDocument, campaignDocument } from '../../shared/schema/campaign.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignRules, ItemPack } from '../../shared/schema/rules.ts'

/** What the starting level and money show before the game master sets them (decision 114). */
export const STARTING_LEVEL_SHOWN = 5
export const STARTING_MONEY_SHOWN = 3000

export interface RulesDraft {
  /** The campaign's name, as typed. */
  name: string
  /** The species players may create, in Pokédex order. */
  species: readonly string[]
  startingLevel: number
  startingMoney: number
  /** Nothing until the game master chooses: neither has a default. */
  natures: CampaignRules['natures'] | undefined
  moveAccess: MoveAccess | undefined
  commonMoves: readonly string[]
  itemPacks: readonly ItemPack[]
}

/** The species of a list that the game data has, in Pokédex order, each once. */
export function inDexOrder(species: readonly string[], pack: DataPack): string[] {
  return [...new Set(species)].sort((a, b) => (pack.species[a]?.num ?? 0) - (pack.species[b]?.num ?? 0))
}

// What a tap does with the species the picker shows. Nothing changes until a button is tapped: looking a Pokémon up by name
// never unticks another. The rules keep the ticked species themselves, not the filters that led to them.

/** Only these species, and no other: the species shown become the playable ones (decision 129). */
export function only(species: readonly string[], pack: DataPack): string[] {
  return inDexOrder(species, pack)
}

/** The chosen species with some more ticked. */
export function ticked(chosen: readonly string[], species: readonly string[], pack: DataPack): string[] {
  return inDexOrder([...chosen, ...species], pack)
}

/** The chosen species with some unticked. */
export function unticked(chosen: readonly string[], species: readonly string[]): string[] {
  return chosen.filter((id) => !species.includes(id))
}

/** A campaign not yet set: every species, the start values shown by default, and the rest to choose. */
export function newDraft(pack: DataPack): RulesDraft {
  return {
    name: '',
    species: inDexOrder(Object.keys(pack.species), pack),
    startingLevel: STARTING_LEVEL_SHOWN,
    startingMoney: STARTING_MONEY_SHOWN,
    natures: undefined,
    moveAccess: undefined,
    commonMoves: [],
    itemPacks: [],
  }
}

/** The rules in force of a campaign, ready to be changed. */
export function draftOf(campaign: CampaignDocument, pack: DataPack): RulesDraft {
  const rules = campaign.rulesHistory.at(-1)
  if (!rules) throw new Error('A campaign always has rules')
  return {
    name: campaign.name,
    species: inDexOrder(rules.species, pack),
    startingLevel: rules.startingLevel,
    startingMoney: rules.startingMoney,
    natures: rules.natures,
    moveAccess: rules.moveAccess,
    commonMoves: rules.commonMoves,
    itemPacks: rules.itemPacks,
  }
}

/** What must still be set before the rules can be saved. */
export type Gap = 'name' | 'species' | 'natures' | 'moveAccess' | 'itemPacks'

export interface DraftState {
  gaps: Gap[]
  /** What the rules name that the game data does not have, or name twice: an item pack without a name, two packs with one name. */
  problems: RulesProblem[]
}

export function stateOf(draft: RulesDraft, pack: DataPack): DraftState {
  const gaps: Gap[] = []
  if (draft.name.trim() === '') gaps.push('name')
  if (draft.species.length === 0) gaps.push('species')
  if (!draft.natures) gaps.push('natures')
  if (!draft.moveAccess) gaps.push('moveAccess')
  if (draft.itemPacks.length === 0) gaps.push('itemPacks')
  return { gaps, problems: checkRules({ species: [...draft.species], commonMoves: [...draft.commonMoves], itemPacks: [...draft.itemPacks] }, pack) }
}

/** The rules a draft makes, without their version; nothing while something is still to choose. */
function rulesOf(draft: RulesDraft, pack: DataPack): Omit<CampaignRules, 'version'> | undefined {
  const { gaps, problems } = stateOf(draft, pack)
  if (gaps.length > 0 || problems.length > 0 || !draft.natures || !draft.moveAccess) return undefined
  return {
    species: inDexOrder(draft.species, pack),
    startingLevel: draft.startingLevel,
    startingMoney: draft.startingMoney,
    natures: draft.natures,
    moveAccess: draft.moveAccess,
    commonMoves: [...draft.commonMoves],
    itemPacks: draft.itemPacks.map((itemPack) => ({ name: itemPack.name.trim(), items: itemPack.items.map((stack) => ({ ...stack })) })),
  }
}

/**
 * The campaign as a save leaves it: a new one with its first rules, or the
 * one given with its name changed and, when a rule changed, one more version
 * in its history. The very campaign given when nothing changed. Nothing
 * while the draft cannot be saved.
 */
export function campaignFrom(draft: RulesDraft, before: CampaignDocument | undefined, pack: DataPack, newId: () => string): CampaignDocument | undefined {
  const rules = rulesOf(draft, pack)
  if (!rules) return undefined
  const name = draft.name.trim()
  if (!before) {
    return campaignDocument.parse({
      kind: CAMPAIGN_KIND,
      schemaVersion: CAMPAIGN_SCHEMA_VERSION,
      id: newId(),
      revision: 0,
      dataPackVersion: pack.version,
      name,
      rulesHistory: [{ version: 1, ...rules }],
    })
  }
  // The rules in force, read the way the draft's are: what differs is then a change of rules and nothing else.
  const rulesChanged = !sameValue(rulesOf(draftOf(before, pack), pack), rules)
  if (!rulesChanged && name === before.name) return before
  // A document of ours about to be kept: a shape the schema refuses here is a fault of this code, not of the user.
  return campaignDocument.parse({
    ...before,
    revision: before.revision + 1,
    dataPackVersion: pack.version,
    name,
    rulesHistory: rulesChanged ? [...before.rulesHistory, { version: (before.rulesHistory.at(-1)?.version ?? 0) + 1, ...rules }] : before.rulesHistory,
  })
}

/** Whether the draft holds changes a save would keep: against the campaign as kept, or against a campaign not yet set. */
export function hasChanges(draft: RulesDraft, before: CampaignDocument | undefined, pack: DataPack): boolean {
  const saved = before ? draftOf(before, pack) : newDraft(pack)
  return !sameValue({ ...draft, name: draft.name.trim() }, saved)
}
