/**
 * The filters of the species picker (decision 112): they narrow the list the
 * game master sees, and the picker ticks or unticks what is shown. The rules
 * keep the ticked species themselves, not the filters that led to them.
 */
import type { DataPack, SpeciesData } from '../../data/types.ts'
import { STAT_IDS } from '../../game-rules/stats.ts'
import type { Language } from '../../i18n/index.ts'
import { answers } from '../../shared/text/plain.ts'
import { inDexOrder } from './rules-draft.ts'

export interface SpeciesFilter {
  /** Part of a name. */
  search: string
  /** `first`: has not evolved from another playable Pokémon. `final`: evolves into no other playable Pokémon. */
  stage: 'any' | 'first' | 'final'
  legendary: 'any' | 'only' | 'without'
  /** A type as the game data names it; nothing for any. */
  type: string | undefined
  /** The six base stats added up, against a number. */
  statTotal: { side: 'atMost' | 'atLeast'; total: number } | undefined
}

/** Every Pokémon is shown. */
export const NO_FILTER: SpeciesFilter = { search: '', stage: 'any', legendary: 'any', type: undefined, statTotal: undefined }

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

function passes(species: SpeciesData, filter: SpeciesFilter, pack: DataPack, language: Language): boolean {
  if (!answers(species.name[language], filter.search)) return false
  // Stages the game data does not have as species (a later generation's baby, say) do not count: nobody can play them.
  if (filter.stage === 'first' && species.earlierStages.some((earlier) => earlier in pack.species)) return false
  if (filter.stage === 'final' && species.evolutions.length > 0) return false
  if (filter.legendary !== 'any' && species.tags.some((tag) => LEGENDARY_TAGS.includes(tag)) !== (filter.legendary === 'only')) return false
  if (filter.type !== undefined && !species.types.includes(filter.type)) return false
  if (filter.statTotal) {
    const total = statTotalOf(species)
    if (filter.statTotal.side === 'atMost' ? total > filter.statTotal.total : total < filter.statTotal.total) return false
  }
  return true
}

/** The species the filters leave, in Pokédex order. */
export function speciesShown(pack: DataPack, filter: SpeciesFilter, language: Language): SpeciesData[] {
  return Object.values(pack.species)
    .filter((species) => passes(species, filter, pack, language))
    .sort((a, b) => a.num - b.num)
}

/** The chosen species with some more ticked. */
export function ticked(chosen: readonly string[], species: readonly string[], pack: DataPack): string[] {
  return inDexOrder([...chosen, ...species], pack)
}

/** The chosen species with some unticked. */
export function unticked(chosen: readonly string[], species: readonly string[]): string[] {
  return chosen.filter((id) => !species.includes(id))
}
