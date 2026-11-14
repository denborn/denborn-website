/**
 * The shape of the game data pack.
 *
 * The pack is generated when the app is built (scripts/data/build-datapack.ts)
 * from the pinned engine packages and the pinned PokéAPI tables. Ids are
 * Showdown's ids: lower-case, no spaces or punctuation. They never change, so
 * saves refer to them; names and descriptions are for display only.
 */
import type { BagEffect } from '../game-rules/bag-effects.ts'
import type { LearnsetEntry } from '../game-rules/learnset.ts'

export interface Localized {
  en: string
  fr: string
}

export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type Gender = 'M' | 'F' | 'N'

export interface Evolution {
  to: string
  method: 'level' | 'item' | 'trade'
  /** For `level`: the level from which the evolution is offered. */
  level?: number
  /** For `item`: the item spent. For `trade`: the Linking Cord (decision 7). */
  item?: string
}

export interface SpeciesData {
  id: string
  /** National Pokédex number. */
  num: number
  name: Localized
  types: string[]
  baseStats: Record<StatId, number>
  /** Every Ability the species can have, Hidden Ability included. */
  abilities: string[]
  hiddenAbility?: string
  /** The genders a Pokémon of this species can be. */
  genders: Gender[]
  /** Share of males and females; absent for single-gender and genderless species. */
  genderRatio?: { M: number; F: number }
  /** Base EXP yield, for the reward default. */
  baseExp: number
  /** Showdown's tags, such as "Sub-Legendary" or "Mythical", for the GM's species filters. */
  tags: string[]
  /** Earlier stages, nearest first. Stages from later generations are listed too: they only feed the learnset. */
  earlierStages: string[]
  /** Evolutions into other playable species. */
  evolutions: Evolution[]
  /** The species' moves with those of its earlier stages. */
  learnset: LearnsetEntry[]
  /**
   * The set its battle sprites come from: Gen 5 animated when Showdown has
   * them, otherwise its 3D-styled animated set, otherwise none (the name is
   * shown instead).
   */
  sprite: SpriteSet | null
  /** Whether that set has a separate female sprite. */
  femaleSprite: boolean
}

export type SpriteSet = 'gen5ani' | 'ani'

export interface MoveData {
  id: string
  name: Localized
  description: Localized
  type: string
  category: 'Physical' | 'Special' | 'Status'
  /** 0 for moves without a fixed power. */
  power: number
  /** `true` for moves that never miss. */
  accuracy: number | true
  /** Base PP, before any PP Up. */
  pp: number
  /** True when PP Ups cannot raise this move's PP. */
  fixedPp: boolean
  priority: number
  /** How the move picks its target, in the engine's vocabulary. */
  target: string
  /** True when a GM can pick this move for the common-move supplement (decision 71). */
  supplement: boolean
}

export interface AbilityData {
  id: string
  name: Localized
  description: Localized
}

export type ItemIcon = { from: 'showdown'; index: number } | { from: 'pokeapi'; file: string }

export interface ItemData {
  id: string
  name: Localized
  description: Localized
  icon: ItemIcon
  /** True when a Pokémon can hold it (Showdown's items, Berries included). */
  holdable: boolean
  berry: boolean
  /** What it does when used from the Bag, in battle or outside. */
  bag?: BagEffect
  /** PP Ups it gives to one move when used outside battle: 1 for PP Up, 3 for PP Max. */
  ppUps?: number
  /** True when an evolution spends it. */
  evolution?: true
}

export interface NatureData {
  id: string
  name: Localized
  /** Stat raised by 10% and stat lowered by 10%; both absent for a neutral nature. */
  plus?: StatId
  minus?: StatId
}

export interface TypeData {
  id: string
  name: Localized
  /** Damage multiplier of a move of this type against each defending type. Types not listed take ×1. */
  against: Record<string, number>
}

export interface DataPack {
  /** Stored in every save: a save made with another pack says so instead of being read as if nothing changed. */
  version: string
  sources: {
    engine: string
    pokeapi: string
  }
  species: Record<string, SpeciesData>
  moves: Record<string, MoveData>
  abilities: Record<string, AbilityData>
  items: Record<string, ItemData>
  natures: Record<string, NatureData>
  types: Record<string, TypeData>
  statNames: Record<StatId, Localized>
}
