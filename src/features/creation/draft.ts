/**
 * A character being created: what the player has chosen so far, what each
 * step still needs, and the character it becomes. Pure: the screens only show
 * it and send choices.
 *
 * A choice that cannot be is not taken: a stat cannot be raised past its
 * budget, a seventh move cannot be added. What can only be judged on the
 * whole (all 300 points placed, at least one move) is told by the step's
 * check. `checkCreation` has the last word on the finished character.
 */
import type { DataPack, Gender } from '../../data/types.ts'
import { type CreationProblem, checkCreation, maxHpOf } from '../../domain/character-check.ts'
import { ATTRIBUTE_CAP, type AttributeId, type AttributePoints, CREATION_MIN, attributeTally, splitAttributes } from '../../game-rules/attributes.ts'
import { EV_MAX, IV_MAX, evBudget, ivBudget, spreadTotal } from '../../game-rules/budgets.ts'
import { eligibleMoves } from '../../game-rules/eligibility.ts'
import { expForLevel } from '../../game-rules/exp.ts'
import { type NicknameProblem, checkNickname, tidyNickname } from '../../game-rules/nickname.ts'
import type { StatId, StatSpread } from '../../game-rules/stats.ts'
import type { Invitation } from '../../shared/codec/codes.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import type { CampaignRules } from '../../shared/schema/rules.ts'

export const MOVES_MAX = 6

export interface CreationDraft {
  species?: string
  /** As typed; tidied when checked and when the character is made. */
  nickname: string
  gender?: Gender
  nature?: string
  ability?: string
  /** The six roleplay attributes as the player sees them: one number each. */
  attributes: AttributePoints
  ivs: StatSpread
  evs: StatSpread
  /** In the order chosen. */
  moves: string[]
  /** Which of the campaign's item packs, by its place in the list. */
  pack?: number
  heldItem?: string
}

const NO_POINTS: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

/** Nothing chosen yet. The attributes start even, at 50 each: the 300 points placed, ready to be moved around. */
export const emptyDraft: CreationDraft = {
  nickname: '',
  attributes: { strength: 50, dexterity: 50, endurance: 50, perception: 50, charisma: 50, intelligence: 50 },
  ivs: NO_POINTS,
  evs: NO_POINTS,
  moves: [],
}

export type DraftChoice =
  | { choose: 'species'; species: string }
  | { choose: 'nickname'; nickname: string }
  | { choose: 'gender'; gender: Gender }
  | { choose: 'nature'; nature: string }
  | { choose: 'ability'; ability: string }
  | { choose: 'attribute'; attribute: AttributeId; value: number }
  | { choose: 'iv'; stat: StatId; value: number }
  | { choose: 'ev'; stat: StatId; value: number }
  /** Adds the move, or takes it back out. */
  | { choose: 'move'; move: string }
  | { choose: 'pack'; pack: number }
  | { choose: 'held'; item: string | undefined }

/** What a choice is judged against: the game data and the campaign's rules. */
export interface CreationContext {
  pack: DataPack
  rules: CampaignRules
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(value)))

/** The highest an attribute can go with the others as they are: 95, or less when the level's extra points run out. */
export function attributeCeiling(attributes: AttributePoints, attribute: AttributeId, level: number): number {
  let value = ATTRIBUTE_CAP
  while (value > attributes[attribute] && attributeTally({ ...attributes, [attribute]: value }, level).extraLeft < 0) value--
  return value
}

/** The highest a stat's IVs or EVs can go with the other stats as they are. */
export function spreadCeiling(spread: StatSpread, stat: StatId, max: number, budget: number): number {
  return Math.min(max, spread[stat] + Math.max(0, budget - spreadTotal(spread)))
}

/** The moves the Pokémon may choose from, under the campaign's rules, at its starting level. */
export function movesOffered(draft: CreationDraft, { pack, rules }: CreationContext): string[] {
  const species = draft.species ? pack.species[draft.species] : undefined
  return species ? eligibleMoves(species.learnset, rules.startingLevel, rules.moveAccess, rules.commonMoves).filter((move) => move in pack.moves) : []
}

/** The draft after one choice. */
export function choose(draft: CreationDraft, choice: DraftChoice, context: CreationContext): CreationDraft {
  const { pack, rules } = context
  const level = rules.startingLevel
  switch (choice.choose) {
    case 'species': {
      const species = pack.species[choice.species]
      if (!species || species.id === draft.species) return draft
      // Another species has other moves to choose from: those start over. The rest is kept where it still fits.
      const next: CreationDraft = { ...draft, species: species.id, moves: [] }
      // A species of one gender, or of none, leaves nothing to choose.
      const onlyGender = species.genders.length === 1 ? species.genders[0] : undefined
      const gender = onlyGender ?? (draft.gender && species.genders.includes(draft.gender) ? draft.gender : undefined)
      if (gender) next.gender = gender
      else delete next.gender
      const ability = species.abilities.length === 1 ? species.abilities[0] : draft.ability && species.abilities.includes(draft.ability) ? draft.ability : undefined
      if (ability) next.ability = ability
      else delete next.ability
      return next
    }
    case 'nickname':
      return { ...draft, nickname: choice.nickname }
    case 'gender':
      return { ...draft, gender: choice.gender }
    case 'nature':
      return { ...draft, nature: choice.nature }
    case 'ability':
      return { ...draft, ability: choice.ability }
    case 'attribute': {
      const value = clamp(choice.value, CREATION_MIN, attributeCeiling(draft.attributes, choice.attribute, level))
      return { ...draft, attributes: { ...draft.attributes, [choice.attribute]: value } }
    }
    case 'iv':
      return { ...draft, ivs: { ...draft.ivs, [choice.stat]: clamp(choice.value, 0, spreadCeiling(draft.ivs, choice.stat, IV_MAX, ivBudget(level))) } }
    case 'ev':
      return { ...draft, evs: { ...draft.evs, [choice.stat]: clamp(choice.value, 0, spreadCeiling(draft.evs, choice.stat, EV_MAX, evBudget(level))) } }
    case 'move': {
      if (draft.moves.includes(choice.move)) return { ...draft, moves: draft.moves.filter((move) => move !== choice.move) }
      if (draft.moves.length >= MOVES_MAX || !movesOffered(draft, context).includes(choice.move)) return draft
      return { ...draft, moves: [...draft.moves, choice.move] }
    }
    case 'pack': {
      const itemPack = rules.itemPacks[choice.pack]
      if (!itemPack) return draft
      const next: CreationDraft = { ...draft, pack: choice.pack }
      // An item held from the other pack goes back with it.
      if (!itemPack.items.some((stack) => stack.item === draft.heldItem)) delete next.heldItem
      return next
    }
    case 'held': {
      const next: CreationDraft = { ...draft }
      const itemPack = draft.pack === undefined ? undefined : rules.itemPacks[draft.pack]
      const holdable = choice.item !== undefined && pack.items[choice.item]?.holdable && itemPack?.items.some((stack) => stack.item === choice.item)
      if (holdable && choice.item !== undefined) next.heldItem = choice.item
      else delete next.heldItem
      return next
    }
  }
}

// ---------------------------------------------------------------------------
// What each step still needs
// ---------------------------------------------------------------------------

export type SpeciesProblem = 'none-chosen' | 'not-playable'

export function speciesProblem(draft: CreationDraft, rules: CampaignRules): SpeciesProblem | undefined {
  if (!draft.species) return 'none-chosen'
  return rules.species.includes(draft.species) ? undefined : 'not-playable'
}

export interface IdentityProblems {
  nickname?: NicknameProblem
  gender?: true
  nature?: true
  ability?: true
}

/** What the identity step still needs. An empty object means the step is done. */
export function identityProblems(draft: CreationDraft, { pack, rules }: CreationContext): IdentityProblems {
  const problems: IdentityProblems = {}
  const species = draft.species ? pack.species[draft.species] : undefined
  const nickname = checkNickname(tidyNickname(draft.nickname))
  if (nickname) problems.nickname = nickname
  if (!draft.gender || !species?.genders.includes(draft.gender)) problems.gender = true
  // Where every Pokémon is neutral there is no nature to choose.
  if (rules.natures === 'chosen' && !(draft.nature && draft.nature in pack.natures)) problems.nature = true
  if (!draft.ability || !species?.abilities.includes(draft.ability)) problems.ability = true
  return problems
}

/** The steps of creation, in the order the owner set (decision 101). */
export const STEPS = ['species', 'identity', 'attributes', 'training', 'moves', 'items', 'review'] as const
export type StepId = (typeof STEPS)[number]

/** Whether a step has what it needs for the player to go on. */
export function isStepDone(step: StepId, draft: CreationDraft, context: CreationContext): boolean {
  switch (step) {
    case 'species':
      return speciesProblem(draft, context.rules) === undefined
    case 'identity':
      return Object.keys(identityProblems(draft, context)).length === 0
    case 'attributes': {
      const tally = attributeTally(draft.attributes, context.rules.startingLevel)
      return tally.toPlace === 0 && tally.extraLeft >= 0
    }
    case 'training':
      // IV and EV points may wait, and a choice past the budget is never taken.
      return true
    case 'moves':
      return draft.moves.length >= 1 && draft.moves.length <= MOVES_MAX
    case 'items':
      return draft.pack !== undefined && context.rules.itemPacks[draft.pack] !== undefined
    case 'review':
      return true
  }
}

// ---------------------------------------------------------------------------
// The character it becomes
// ---------------------------------------------------------------------------

/**
 * The character a finished draft makes: at the campaign's starting level and
 * money, with full HP and PP, its chosen pack in its bag and one item of it
 * held if it chose so. Nothing when the draft is not finished.
 */
export function toCharacter(draft: CreationDraft, invitation: Invitation, pack: DataPack, id: string): CharacterDocument | undefined {
  const rules = invitation.rules
  const context = { pack, rules }
  if (!STEPS.every((step) => isStepDone(step, draft, context))) return undefined
  const itemPack = draft.pack === undefined ? undefined : rules.itemPacks[draft.pack]
  if (!draft.species || !draft.gender || !draft.ability || !itemPack) return undefined
  const level = rules.startingLevel
  // The held item is one taken out of the bag.
  const bag = itemPack.items
    .map((stack) => (stack.item === draft.heldItem ? { ...stack, quantity: stack.quantity - 1 } : stack))
    .filter((stack) => stack.quantity > 0)
  const character: CharacterDocument = {
    kind: 'denborn.character',
    schemaVersion: 1,
    id,
    revision: 0,
    dataPackVersion: pack.version,
    campaign: { id: invitation.campaign.id, name: invitation.campaign.name, rulesVersion: rules.version },
    species: draft.species,
    nickname: tidyNickname(draft.nickname),
    gender: draft.gender,
    level,
    exp: expForLevel(level),
    ...(rules.natures === 'chosen' && draft.nature ? { nature: draft.nature } : {}),
    ability: draft.ability,
    attributes: splitAttributes(draft.attributes),
    ivs: draft.ivs,
    evs: draft.evs,
    moves: draft.moves.map((move) => ({ id: move, ppUps: 0, pp: pack.moves[move]?.pp ?? 0 })),
    ...(draft.heldItem ? { heldItem: draft.heldItem } : {}),
    bag,
    money: rules.startingMoney,
    hp: 0,
    condition: { state: 'standing' },
  }
  return { ...character, hp: maxHpOf(character, pack) ?? 0 }
}

/** Everything the rules still find wrong with the character a draft makes; an empty list when it is ready to be made. */
export function creationProblems(draft: CreationDraft, invitation: Invitation, pack: DataPack): CreationProblem[] | undefined {
  const character = toCharacter(draft, invitation, pack, 'not-made-yet')
  return character ? checkCreation(character, invitation.rules, pack) : undefined
}
