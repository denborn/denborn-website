/**
 * From an encounter and the characters who meet it to the battle the engine
 * is asked to play. Characters come in as they are: their HP, PP and status
 * carry over (decision 58). Enemies start every fight whole.
 */
import type { BattleSetup, CombatantSetup } from '../../battle/contract'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Encounter, Enemy } from '../../shared/schema/encounter'

/** The nature the engine is given for a Pokémon whose campaign makes every nature neutral: it changes no stat. */
const NEUTRAL_NATURE = 'hardy'

/** A character downed before the fight sits it out, its stacks frozen (decision 51); a dead one fights no more. */
export function canFight(character: CharacterDocument): boolean {
  return character.condition.state === 'standing' && character.hp > 0
}

function ofCharacter(character: CharacterDocument): CombatantSetup {
  return {
    id: character.id,
    species: character.species,
    level: character.level,
    gender: character.gender,
    ability: character.ability,
    nature: character.nature ?? NEUTRAL_NATURE,
    ivs: character.ivs,
    evs: character.evs,
    moves: character.moves.map((slot) => ({ id: slot.id, ppUps: slot.ppUps, pp: slot.pp })),
    hp: character.hp,
    // Players' Pokémon always go through Agony.
    agony: true,
    ...(character.heldItem ? { item: character.heldItem } : {}),
    ...(character.status ? { status: character.status } : {}),
  }
}

function ofEnemy(enemy: Enemy): CombatantSetup {
  return {
    id: enemy.id,
    species: enemy.species,
    level: enemy.level,
    gender: enemy.gender,
    ability: enemy.ability,
    nature: enemy.nature ?? NEUTRAL_NATURE,
    ivs: enemy.ivs,
    evs: enemy.evs,
    moves: enemy.moves.map((slot) => ({ id: slot.id, ppUps: slot.ppUps })),
    agony: enemy.agony,
    ...(enemy.heldItem ? { item: enemy.heldItem } : {}),
  }
}

export type LaunchProblem =
  /** No character of the party is able to fight. */
  | 'nobody-can-fight'
  /** A character and an enemy, or two characters, go by the same id: the fight could not tell them apart. */
  | 'same-id'

export type Launch =
  | {
      ok: true
      setup: BattleSetup
      /** The characters on the line, in the order they stand, and those left out because they cannot fight. */
      fighting: string[]
      sittingOut: string[]
    }
  | { ok: false; problem: LaunchProblem }

/**
 * The battle an encounter makes with these characters, in the order given:
 * that order is where they first stand on their line.
 */
export function fightSetup(encounter: Encounter, party: readonly CharacterDocument[], seed: string): Launch {
  const fighters = party.filter(canFight)
  if (fighters.length === 0) return { ok: false, problem: 'nobody-can-fight' }
  const ids = [...fighters.map((character) => character.id), ...encounter.enemies.map((enemy) => enemy.id)]
  if (new Set(ids).size !== ids.length) return { ok: false, problem: 'same-id' }
  return {
    ok: true,
    setup: { seed, players: fighters.map(ofCharacter), enemies: encounter.enemies.map(ofEnemy) },
    fighting: fighters.map((character) => character.id),
    sittingOut: party.filter((character) => !canFight(character)).map((character) => character.id),
  }
}

/** A seed for the engine's random numbers, from eight random bytes: four 16-bit numbers joined by commas. */
export function seedFrom(bytes: Uint8Array): string {
  const numbers: number[] = []
  for (let at = 0; at < 8; at += 2) numbers.push(((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0))
  return numbers.join(',')
}
