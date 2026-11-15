/**
 * The turn of a Pokémon whose action is not a move: the Bag (decision 21) and
 * WAIT (decision 144). When its turn comes, whatever would stop its move this
 * round stops the action too: sleep, a freeze, full paralysis, a flinch,
 * confusion, infatuation. The counters of those conditions move as they do
 * for a move.
 */
import type { Battle, Pokemon } from '@pkmn/sim'
import { emit, stateOf } from './state'

/**
 * Brings a Pokémon to its turn and says whether it can act.
 *
 * Struggle carries the check because the engine already exempts it from
 * everything that only restricts which move may be chosen (Choice items,
 * Disable, Taunt, Imprison).
 */
export function comesToItsTurn(battle: Battle, pokemon: Pokemon, target: Pokemon | null): boolean {
  pokemon.activeMoveActions++
  const carrier = battle.dex.getActiveMove('struggle')
  battle.setActiveMove(carrier, pokemon, target)
  const canAct = battle.runEvent('BeforeMove', pokemon, target, carrier) as unknown
  if (!canAct) {
    battle.runEvent('MoveAborted', pokemon, target, carrier)
    battle.clearActiveMove(true)
    return false
  }
  battle.clearActiveMove()
  return true
}

export const waitHandlers = {
  /** WAIT (decisions 137 and 144): the Pokémon's turn passes as for any action, and it does nothing. */
  onDenbornWait(this: Battle, pokemon: Pokemon): void {
    // A Pokémon that went down before its turn came has no turn (Agony rule 3).
    if (pokemon.fainted) return
    if (comesToItsTurn(this, pokemon, null)) emit(this, 'wait', stateOf(pokemon).id)
  },
}
