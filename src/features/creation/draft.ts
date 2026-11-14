/**
 * A character being created: what the player has chosen so far, and what is
 * still wrong with each step. Pure: the screens only show it and send choices.
 *
 * The steps check as they go with the same rules as `checkCreation`, which
 * has the last word on the finished character.
 */
import type { DataPack, Gender } from '../../data/types.ts'
import { type NicknameProblem, checkNickname, tidyNickname } from '../../game-rules/nickname.ts'
import type { CampaignRules } from '../../shared/schema/rules.ts'

export interface CreationDraft {
  species?: string
  /** As typed; tidied when checked and when the character is made. */
  nickname: string
  gender?: Gender
  nature?: string
  ability?: string
}

export const emptyDraft: CreationDraft = { nickname: '' }

export type DraftChoice =
  | { choose: 'species'; species: string }
  | { choose: 'nickname'; nickname: string }
  | { choose: 'gender'; gender: Gender }
  | { choose: 'nature'; nature: string }
  | { choose: 'ability'; ability: string }

/** The draft after one choice. Choosing a species keeps what still fits it and fills in what has only one answer. */
export function choose(draft: CreationDraft, choice: DraftChoice, pack: DataPack): CreationDraft {
  switch (choice.choose) {
    case 'species': {
      const species = pack.species[choice.species]
      if (!species) return draft
      const next: CreationDraft = { ...draft, species: species.id }
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
  }
}

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
export function identityProblems(draft: CreationDraft, rules: CampaignRules, pack: DataPack): IdentityProblems {
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
