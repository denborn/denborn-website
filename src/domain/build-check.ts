/**
 * Checks a Pokémon's build against a campaign's rules and the game data:
 * its species, gender, Ability, nature, training, moves and held item.
 * Characters and the enemies of an encounter are built under the same rules
 * (kickoff prompt: "enemies use the same budgets and move rules"), so both
 * are checked here.
 */
import type { DataPack, Gender } from '../data/types.ts'
import { eligibleMoves } from '../game-rules/eligibility.ts'
import type { StatSpread } from '../game-rules/stats.ts'
import { type TrainingProblem, checkTraining } from '../game-rules/training.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { repeated } from './repeated.ts'

/** What a character and an enemy have in common. */
export interface Build {
  species: string
  gender: Gender
  level: number
  nature?: string | undefined
  ability: string
  ivs: StatSpread
  evs: StatSpread
  moves: readonly { id: string; ppUps: number }[]
  heldItem?: string | undefined
}

export type BuildProblem =
  | { kind: 'unknown-species' }
  | { kind: 'gender' }
  | { kind: 'ability' }
  | { kind: 'nature-missing' }
  | { kind: 'nature-not-allowed' }
  | { kind: 'unknown-nature' }
  | { kind: 'training'; problem: TrainingProblem }
  | { kind: 'unknown-move'; move: string }
  | { kind: 'repeated-move'; move: string }
  | { kind: 'move-not-eligible'; move: string }
  | { kind: 'pp-ups-not-allowed'; move: string }
  | { kind: 'held-item' }

export function checkBuild(build: Build, rules: CampaignRules, pack: DataPack): BuildProblem[] {
  const problems: BuildProblem[] = []
  if (rules.natures === 'neutral') {
    if (build.nature !== undefined) problems.push({ kind: 'nature-not-allowed' })
  } else if (build.nature === undefined) problems.push({ kind: 'nature-missing' })
  else if (!(build.nature in pack.natures)) problems.push({ kind: 'unknown-nature' })

  for (const problem of checkTraining(build, build.level)) problems.push({ kind: 'training', problem })
  if (build.heldItem !== undefined && !pack.items[build.heldItem]?.holdable) problems.push({ kind: 'held-item' })

  // Everything below needs the species.
  const species = pack.species[build.species]
  if (!species) return [...problems, { kind: 'unknown-species' }]
  if (!species.genders.includes(build.gender)) problems.push({ kind: 'gender' })
  if (!species.abilities.includes(build.ability)) problems.push({ kind: 'ability' })

  const eligible = new Set(eligibleMoves(species.learnset, build.level, rules.moveAccess, rules.commonMoves))
  for (const move of repeated(build.moves.map((slot) => slot.id))) problems.push({ kind: 'repeated-move', move })
  for (const slot of build.moves) {
    const move = pack.moves[slot.id]
    if (!move) problems.push({ kind: 'unknown-move', move: slot.id })
    else {
      if (!eligible.has(slot.id)) problems.push({ kind: 'move-not-eligible', move: slot.id })
      if (move.fixedPp && slot.ppUps > 0) problems.push({ kind: 'pp-ups-not-allowed', move: slot.id })
    }
  }
  return problems
}
