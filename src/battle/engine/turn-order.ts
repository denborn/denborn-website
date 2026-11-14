/**
 * Switch: a consensual exchange of Speed for turn order only (DECISIONS.md 1.1
 * "Actions"). The engine recomputes every queued action's speed after each
 * action, so the exchange has to live in that computation: a value written on
 * an action by hand would be overwritten.
 *
 * Only the order of actions changes. `getStat('spe')`, which Gyro Ball and
 * Electro Ball read, and the Speed the engine uses for end-of-round effects are
 * left alone.
 */
import { Battle } from '@pkmn/sim'
import type { Action, Pokemon } from '@pkmn/sim'
import { findCombatant, stateOf } from './state'

interface QueuedAction {
  pokemon?: Pokemon | null
  speed?: number
}

export const turnOrderOverrides = {
  getActionSpeed(this: Battle, action: QueuedAction): void {
    Battle.prototype.getActionSpeed.call(this, action)
    if (!action.pokemon) return
    const ownerId = stateOf(action.pokemon).speedOwner
    if (ownerId === null) return
    const owner = findCombatant(this, ownerId)
    if (owner) action.speed = owner.getActionSpeed()
  },

  /**
   * In Gen 9 the remaining actions are put back in Speed order after every
   * action, but the engine only does so when the next action is a move. The
   * Bag action and the Agony turn are not moves, so the same step is taken
   * here when one of them is next: they keep their place "in Speed order"
   * when Speeds change in the middle of a round.
   */
  runAction(this: Battle, action: Action): boolean | undefined {
    const stopped = Battle.prototype.runAction.call(this, action)
    if (stopped || this.ended || this.requestState) return stopped
    if (this.queue.peek()?.choice !== 'event') return stopped
    this.updateSpeed()
    for (const queued of this.queue.list) {
      if (queued.pokemon) this.getActionSpeed(queued)
    }
    this.queue.sort()
    return stopped
  },
}

/**
 * Exchanges the turn-order Speeds of two Pokémon for the current round.
 * Chaining swaps whatever each currently holds: if A (100) exchanges with B
 * (50) and then with C (80), A acts at 80, B at 100 and C at 50.
 */
export function exchangeTurnOrderSpeed(a: Pokemon, b: Pokemon): void {
  const stateA = stateOf(a)
  const stateB = stateOf(b)
  const heldByA = stateA.speedOwner ?? stateA.id
  const heldByB = stateB.speedOwner ?? stateB.id
  stateA.speedOwner = heldByB === stateA.id ? null : heldByB
  stateB.speedOwner = heldByA === stateB.id ? null : heldByA
}

export function clearSpeedExchanges(battle: Battle): void {
  for (const pokemon of battle.getAllPokemon()) stateOf(pokemon).speedOwner = null
}
