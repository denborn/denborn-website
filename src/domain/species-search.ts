/**
 * Looking a Pokémon up among the game data's species: the filters that narrow
 * a list of them (decisions 112 and 290). They only say what is shown; what
 * is done with the species shown is the screen's own business.
 */
import { generationOf } from '../data/generations.ts'
import type { DataPack, Localized, SpeciesData } from '../data/types.ts'
import { type MoveAccess, isEligible } from '../game-rules/eligibility.ts'
import { STAT_IDS } from '../game-rules/stats.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { answers } from '../shared/text/plain.ts'

export interface SpeciesFilter {
  /** Part of a name. */
  search: string
  /** `first`: has not evolved from another playable Pokémon. `final`: evolves into no other playable Pokémon. */
  stage: 'any' | 'first' | 'final'
  legendary: 'any' | 'only' | 'without'
  /** A type's id in the game data; nothing for any. */
  type: string | undefined
  /** The six base stats added up, against a number. */
  statTotal: { side: 'atMost' | 'atLeast'; total: number } | undefined
  /** Moves the Pokémon can learn, every one of them (decision 301); none for any. Judged against a `LearnScope`. */
  moves: readonly string[]
  /** An Ability the Pokémon can have, its Hidden Ability included; nothing for any. */
  ability: string | undefined
  /** The generation the Pokémon was brought in by (decision 300); nothing for any. */
  generation: number | undefined
}

/** Every Pokémon is shown. */
export const NO_FILTER: SpeciesFilter = { search: '', stage: 'any', legendary: 'any', type: undefined, statTotal: undefined, moves: [], ability: undefined, generation: undefined }

/** What "can learn" is judged against: a level and a campaign's ruling on where moves may come from. */
export interface LearnScope {
  level: number
  access: MoveAccess
}

/**
 * Whether a species can choose a move within a scope: it is in its learnset,
 * from a source the ruling allows, at that level or under. A campaign's common
 * moves are not asked about here: every species has those.
 */
export function canLearn(species: SpeciesData, move: string, scope: LearnScope): boolean {
  return species.learnset.some((entry) => entry.move === move && isEligible(entry, scope.level, scope.access))
}

/** Showdown's tags for the Pokémon the games call Legendary or Mythical. */
const LEGENDARY_TAGS = ['Sub-Legendary', 'Restricted Legendary', 'Mythical']

export function statTotalOf(species: SpeciesData): number {
  return STAT_IDS.reduce((total, stat) => total + species.baseStats[stat], 0)
}

/** The lowest and highest stat totals among the game data's species: the ends of the filter's scale. */
export function statTotalRange(pack: DataPack): { min: number; max: number } {
  const totals = Object.values(pack.species).map(statTotalOf)
  return { min: Math.min(...totals), max: Math.max(...totals) }
}

function passes(species: SpeciesData, filter: SpeciesFilter, pack: DataPack, language: keyof Localized, scope: LearnScope | undefined): boolean {
  if (!answers(species.name[language], filter.search)) return false
  if (filter.ability !== undefined && !species.abilities.includes(filter.ability)) return false
  // With no scope to judge it against, a move anywhere in the learnset counts.
  const learns = (move: string): boolean => (scope ? canLearn(species, move, scope) : species.learnset.some((entry) => entry.move === move))
  if (!filter.moves.every(learns)) return false
  // Stages the game data does not have as species (a later generation's baby, say) do not count: nobody can play them.
  if (filter.stage === 'first' && species.earlierStages.some((earlier) => earlier in pack.species)) return false
  if (filter.stage === 'final' && species.evolutions.length > 0) return false
  if (filter.legendary !== 'any' && species.tags.some((tag) => LEGENDARY_TAGS.includes(tag)) !== (filter.legendary === 'only')) return false
  if (filter.type !== undefined && !species.types.some((type) => type.toLowerCase() === filter.type)) return false
  if (filter.generation !== undefined && generationOf(species.num) !== filter.generation) return false
  if (filter.statTotal) {
    const total = statTotalOf(species)
    if (filter.statTotal.side === 'atMost' ? total > filter.statTotal.total : total < filter.statTotal.total) return false
  }
  return true
}

/** The species the filters leave, in Pokédex order. `scope` says what a move filter is judged against. */
export function speciesShown(pack: DataPack, filter: SpeciesFilter, language: keyof Localized, scope?: LearnScope): SpeciesData[] {
  return Object.values(pack.species)
    .filter((species) => passes(species, filter, pack, language, scope))
    .sort((a, b) => a.num - b.num)
}

const scopeOf = (rules: CampaignRules): LearnScope => ({ level: rules.startingLevel, access: rules.moveAccess })

/** The species a campaign lets a player create that the filters leave, in Pokédex order. A move is one the Pokémon could choose as it is created. */
export function speciesOffered(pack: DataPack, rules: CampaignRules, filter: SpeciesFilter, language: keyof Localized): SpeciesData[] {
  const playable = new Set(rules.species)
  return speciesShown(pack, filter, language, scopeOf(rules)).filter((species) => playable.has(species.id))
}

/** The moves at least one of a campaign's species could choose as it is created: what a move filter has to offer. In no order. */
export function movesLearnable(pack: DataPack, rules: CampaignRules): string[] {
  const scope = scopeOf(rules)
  const moves = new Set<string>()
  for (const id of rules.species) {
    for (const entry of pack.species[id]?.learnset ?? []) if (entry.move in pack.moves && isEligible(entry, scope.level, scope.access)) moves.add(entry.move)
  }
  return [...moves]
}

/** The generations a campaign's species were brought in by: what a generation filter has to offer. Each once, in order. */
export function generationsOffered(pack: DataPack, rules: CampaignRules): number[] {
  const generations = new Set<number>()
  for (const id of rules.species) {
    const species = pack.species[id]
    if (species) generations.add(generationOf(species.num))
  }
  return [...generations].sort((a, b) => a - b)
}

/** The Abilities at least one of a campaign's species can have: what an Ability filter has to offer. In no order. */
export function abilitiesOffered(pack: DataPack, rules: CampaignRules): string[] {
  const abilities = new Set<string>()
  for (const id of rules.species) for (const ability of pack.species[id]?.abilities ?? []) if (ability in pack.abilities) abilities.add(ability)
  return [...abilities]
}
