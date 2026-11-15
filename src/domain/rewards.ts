/**
 * What an encounter is worth to each character of a party, as the app fills
 * it in before the game master awards it (decisions 4, 130, 131 and 134):
 * the game rules' formulas (game-rules/rewards.ts) fed from the game data.
 */
import type { DataPack } from '../data/types.ts'
import { expFor, moneyFor } from '../game-rules/rewards.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { Encounter } from '../shared/schema/encounter.ts'

export interface RewardDefaults {
  /** EXP for each character, by its id: each its own amount (decision 130). */
  exp: Record<string, number>
  /** Pokédollars, the same for each participant (decision 134). */
  money: number
}

/** Whether a character's level has reached the one at which its species evolves by level, while it has not evolved (decision 131). */
function couldEvolve(character: CharacterDocument, pack: DataPack): boolean {
  const evolutions = pack.species[character.species]?.evolutions ?? []
  return evolutions.some((evolution) => evolution.method === 'level' && evolution.level !== undefined && character.level >= evolution.level)
}

/** The rewards of an encounter for the characters given: those the game master counts as having taken part. */
export function rewardDefaults(encounter: Encounter, participants: readonly CharacterDocument[], pack: DataPack): RewardDefaults {
  // An enemy of a species the game data does not have is worth no EXP: the encounter's check says so before any fight.
  const enemies = encounter.enemies.map((enemy) => ({ baseExp: pack.species[enemy.species]?.baseExp ?? 0, level: enemy.level }))
  const exp = Object.fromEntries(
    participants.map((character) => [
      character.id,
      // No Lucky Egg can be held yet (decision 140).
      expFor(enemies, { level: character.level, couldEvolve: couldEvolve(character, pack), holdsLuckyEgg: false }),
    ]),
  )
  return { exp, money: moneyFor(encounter.enemies) }
}
