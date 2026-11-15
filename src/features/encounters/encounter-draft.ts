/**
 * An encounter as the game master is preparing it: its name, its enemies in
 * the order they stand, their Bag, and what is still missing before it can
 * be saved. Pure: the screens only show it and send changes.
 *
 * An enemy is built like a character (kickoff prompt), so its build is the
 * very draft a character's creation uses, under the campaign's rules read at
 * the enemy's own level and with every species of the game data.
 */
import type { DataPack } from '../../data/types.ts'
import { type EncounterProblem, type EnemyProblem, checkEncounter, checkEnemy } from '../../domain/encounter-check.ts'
import { tidyNickname } from '../../game-rules/nickname.ts'
import { LINE_MAX } from '../../game-rules/party.ts'
import type { MobClass } from '../../game-rules/rewards.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import type { ItemStack } from '../../shared/schema/common.ts'
import type { Encounter, Enemy } from '../../shared/schema/encounter.ts'
import type { CampaignRules } from '../../shared/schema/rules.ts'
import { type CreationContext, type CreationDraft, emptyDraft } from '../creation/draft.ts'

export interface EnemyDraft {
  /** Tells it from the other enemies, from the moment it is added. */
  id: string
  level: number
  class: MobClass
  /** True for an enemy that agonizes like a character instead of fainting. */
  agony: boolean
  /** Its species, name, gender, nature, Ability, IVs, EVs, moves and held item, as a character being created has them. */
  build: CreationDraft
  /** The PP Ups its moves were given, by move: only moves it knows, and only those given some. */
  ppUps: Readonly<Record<string, number>>
}

export interface EncounterDraft {
  name: string
  /** In the order they stand on their line. */
  enemies: readonly EnemyDraft[]
  bag: readonly ItemStack[]
}

export const NEW_ENCOUNTER: EncounterDraft = { name: '', enemies: [], bag: [] }

/** The rules an enemy is built under: the campaign's, at the enemy's own level, with every species of the game data to choose from. */
export function enemyContext(rules: CampaignRules, pack: DataPack, level: number): CreationContext {
  return { pack, rules: { ...rules, startingLevel: level, species: Object.keys(pack.species) } }
}

/** An enemy just added: at the level characters start at, a minion that faints, with everything else to choose. */
export function newEnemy(id: string, rules: CampaignRules): EnemyDraft {
  return { id, level: rules.startingLevel, class: 'minion', agony: false, build: emptyDraft, ppUps: {} }
}

/**
 * An enemy with changes made to it. PP Ups stay with their move: those of a
 * move it no longer knows are lost (decision 3).
 */
export function changedEnemy(enemy: EnemyDraft, changes: Partial<EnemyDraft>): EnemyDraft {
  const next = { ...enemy, ...changes }
  return { ...next, ppUps: Object.fromEntries(Object.entries(next.ppUps).filter(([move, ups]) => ups > 0 && next.build.moves.includes(move))) }
}

/** The enemy a draft makes; nothing while its species, gender, Ability or moves are still to choose. */
export function enemyOf(draft: EnemyDraft, rules: CampaignRules): Enemy | undefined {
  const { build } = draft
  if (!build.species || !build.gender || !build.ability || build.moves.length === 0) return undefined
  const nickname = tidyNickname(build.nickname)
  return {
    id: draft.id,
    species: build.species,
    // Left empty, it goes by its species' name.
    ...(nickname ? { nickname } : {}),
    gender: build.gender,
    level: draft.level,
    ...(rules.natures === 'chosen' && build.nature ? { nature: build.nature } : {}),
    ability: build.ability,
    ivs: build.ivs,
    evs: build.evs,
    moves: build.moves.map((id) => ({ id, ppUps: draft.ppUps[id] ?? 0 })),
    ...(build.heldItem ? { heldItem: build.heldItem } : {}),
    agony: draft.agony,
    class: draft.class,
  }
}

/** A saved enemy, ready to be changed. */
export function draftOfEnemy(enemy: Enemy): EnemyDraft {
  const build: CreationDraft = {
    ...emptyDraft,
    species: enemy.species,
    nickname: enemy.nickname ?? '',
    gender: enemy.gender,
    ability: enemy.ability,
    ivs: enemy.ivs,
    evs: enemy.evs,
    moves: enemy.moves.map((slot) => slot.id),
    ...(enemy.nature ? { nature: enemy.nature } : {}),
    ...(enemy.heldItem ? { heldItem: enemy.heldItem } : {}),
  }
  const ppUps = Object.fromEntries(enemy.moves.filter((slot) => slot.ppUps > 0).map((slot) => [slot.id, slot.ppUps]))
  return { id: enemy.id, level: enemy.level, class: enemy.class, agony: enemy.agony, build, ppUps }
}

export function draftOfEncounter(encounter: Encounter): EncounterDraft {
  return { name: encounter.name, enemies: encounter.enemies.map(draftOfEnemy), bag: encounter.bag }
}

/** What an enemy still needs before it can stand in an encounter. */
export type EnemyGap = 'species' | 'gender' | 'nature' | 'ability' | 'moves'

export interface EnemyState {
  gaps: EnemyGap[]
  /** What its build breaks of the rules: points past a budget after its level was lowered, a move it can no longer know. */
  problems: EnemyProblem[]
}

export function enemyState(draft: EnemyDraft, rules: CampaignRules, pack: DataPack): EnemyState {
  const { build } = draft
  const gaps: EnemyGap[] = []
  if (!build.species) gaps.push('species')
  if (!build.gender) gaps.push('gender')
  if (rules.natures === 'chosen' && !build.nature) gaps.push('nature')
  if (!build.ability) gaps.push('ability')
  if (build.moves.length === 0) gaps.push('moves')
  const enemy = enemyOf(draft, rules)
  return { gaps, problems: enemy ? checkEnemy(enemy, rules, pack) : [] }
}

/** The encounter a draft makes; nothing while its name or an enemy is still to set. */
export function encounterOf(draft: EncounterDraft, id: string, rules: CampaignRules): Encounter | undefined {
  const name = draft.name.trim()
  const enemies = draft.enemies.flatMap((enemy) => enemyOf(enemy, rules) ?? [])
  if (name === '' || enemies.length === 0 || enemies.length !== draft.enemies.length || enemies.length > LINE_MAX) return undefined
  return { id, name, enemies, bag: draft.bag.map((stack) => ({ ...stack })) }
}

export interface EncounterState {
  /** What is still to set: the name, or at least one enemy. */
  gaps: ('name' | 'enemies')[]
  /** Each enemy's own state, in the order they stand. */
  enemies: EnemyState[]
  /** What the encounter as a whole breaks: its Bag, two enemies not told apart. */
  problems: EncounterProblem[]
  /** Nothing is missing and nothing is wrong: it can be saved. */
  ready: boolean
}

export function encounterState(draft: EncounterDraft, rules: CampaignRules, pack: DataPack): EncounterState {
  const gaps: EncounterState['gaps'] = []
  if (draft.name.trim() === '') gaps.push('name')
  if (draft.enemies.length === 0) gaps.push('enemies')
  const enemies = draft.enemies.map((enemy) => enemyState(enemy, rules, pack))
  const made = encounterOf(draft, 'not-saved-yet', rules)
  const problems = made ? checkEncounter(made, rules, pack) : []
  return { gaps, enemies, problems, ready: made !== undefined && problems.length === 0 }
}

/** The enemies with one moved a place along the line; unchanged when it is already at that end. */
export function moved(enemies: readonly EnemyDraft[], id: string, by: -1 | 1): EnemyDraft[] {
  const from = enemies.findIndex((enemy) => enemy.id === id)
  const to = from + by
  const line = [...enemies]
  const mover = line[from]
  const other = line[to]
  if (!mover || !other) return line
  line[from] = other
  line[to] = mover
  return line
}

/** Whether a draft holds changes a save would keep: against the encounter as kept, or against one not begun. */
export function hasChanges(draft: EncounterDraft, kept: Encounter | undefined): boolean {
  return !sameValue({ ...draft, name: draft.name.trim() }, kept ? draftOfEncounter(kept) : NEW_ENCOUNTER)
}

/** The campaign with an encounter added, or put in the place of the one it had under that id. */
export function withEncounter(campaign: CampaignDocument, encounter: Encounter): CampaignDocument {
  const others = campaign.encounters.filter((kept) => kept.id !== encounter.id)
  const at = campaign.encounters.findIndex((kept) => kept.id === encounter.id)
  const encounters = at < 0 ? [...others, encounter] : [...others.slice(0, at), encounter, ...others.slice(at)]
  return { ...campaign, revision: campaign.revision + 1, encounters }
}

export function withoutEncounter(campaign: CampaignDocument, id: string): CampaignDocument {
  return { ...campaign, revision: campaign.revision + 1, encounters: campaign.encounters.filter((kept) => kept.id !== id) }
}
