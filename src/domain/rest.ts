/**
 * A rest at a Pokémon Center (spec section 3; decision 11; Agony rule 10;
 * decision 173): started by the game master, for one character. It heals
 * the living and brings a downed character back; it does nothing for the
 * dead. A rest is also the one time, after creation, when a character's
 * Ability and moves may be chosen again.
 */
import type { DataPack } from '../data/types.ts'
import { eligibleMoves } from '../game-rules/eligibility.ts'
import { maxPp } from '../game-rules/pp.ts'
import type { CharacterDocument, MoveSlot } from '../shared/schema/character.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { type Changed, revised } from './changed.ts'
import { maxHpOf } from './character-check.ts'
import { repeated } from './repeated.ts'

const MOVES_MAX = 6

export type RestProblem =
  /** Only a revival item brings back the dead (decision 173). */
  | 'dead'
  /** Its species or its nature is not in the game data: its HP cannot be worked out. */
  | 'unknown-data'

/** The character rested: on its feet, at full HP, with no status condition and every move at its full PP. */
export function rested(character: CharacterDocument, pack: DataPack): Changed<RestProblem> {
  if (character.condition.state === 'dead') return { ok: false, problem: 'dead' }
  const maxHp = maxHpOf(character, pack)
  if (maxHp === undefined) return { ok: false, problem: 'unknown-data' }
  const moves = character.moves.map((slot) => {
    const move = pack.moves[slot.id]
    return move ? { ...slot, pp: maxPp(move.pp, slot.ppUps, move.fixedPp) } : slot
  })
  const next = revised(character, { hp: maxHp, condition: { state: 'standing' }, moves })
  delete next.status
  return { ok: true, character: next }
}

/** The Ability and the moves a character's player picks during its rest. */
export interface Reselection {
  ability: string
  /** From one to six moves, in the order they are kept. */
  moves: readonly string[]
}

export type ReselectionProblem = 'dead' | 'ability' | 'moves'

/**
 * The character with the Ability and the moves chosen during its rest: any
 * Ability of its species, and up to six moves it may know at its level under
 * the campaign's rules. A move it keeps stays as it was; a new one comes with
 * its full PP and no PP Up; a move it drops loses its PP Ups (decision 3).
 */
export function reselected(character: CharacterDocument, choice: Reselection, rules: CampaignRules, pack: DataPack): Changed<ReselectionProblem> {
  if (character.condition.state === 'dead') return { ok: false, problem: 'dead' }
  const species = pack.species[character.species]
  if (!species?.abilities.includes(choice.ability)) return { ok: false, problem: 'ability' }

  const eligible = new Set(eligibleMoves(species.learnset, character.level, rules.moveAccess, rules.commonMoves))
  const wellChosen = choice.moves.length >= 1 && choice.moves.length <= MOVES_MAX && repeated(choice.moves).length === 0 && choice.moves.every((id) => id in pack.moves && eligible.has(id))
  if (!wellChosen) return { ok: false, problem: 'moves' }

  const moves = choice.moves.flatMap((id): MoveSlot[] => {
    const kept = character.moves.find((slot) => slot.id === id)
    const move = pack.moves[id]
    return kept ? [kept] : move ? [{ id, ppUps: 0, pp: move.pp }] : []
  })
  const same = choice.ability === character.ability && moves.length === character.moves.length && moves.every((slot, at) => slot === character.moves[at])
  return { ok: true, character: same ? character : revised(character, { ability: choice.ability, moves }) }
}
