/**
 * Move locks on hand-built actions.
 *
 * The engine enforces a move lock (a rampage such as Outrage, a charging
 * two-turn move, a recharge) when a choice is submitted, by replacing whatever
 * was chosen with the locked move. Extra enemy moves are queued by the adapter
 * without going through that code, and a lock can also begin in the middle of
 * a round between two actions of the same Pokémon. This wrapper applies the
 * engine's own rule at the moment the move is used instead.
 *
 * Engine: Side.chooseMove, the block that starts with `getLockedMove()`.
 */
import { toID } from '@pkmn/sim'
import type { ActiveMove, Battle, Pokemon } from '@pkmn/sim'

interface RunMoveOptions {
  externalMove?: boolean
  originalTarget?: Pokemon
  [key: string]: unknown
}

interface Actions {
  battle: Battle
  runMove(move: string | ActiveMove, pokemon: Pokemon, targetLoc: number, options?: RunMoveOptions): void
}

/** The move a Pokémon is locked into and the target it was first aimed at, as the engine works them out. */
export function lockedAction(pokemon: Pokemon): { move: string; targetLoc: number } | null {
  const locked = pokemon.getLockedMove()
  if (!locked) return null
  const volatile = pokemon.volatiles[locked] as { targetLoc?: number } | undefined
  // 0 means "no stored target" for the engine, so a stored 0 falls through like a missing value.
  const stored = volatile?.targetLoc ? volatile.targetLoc : pokemon.lastMoveTargetLoc
  return { move: locked, targetLoc: stored ? stored : 0 }
}

/**
 * The engine holds a Pokémon in a two-turn move (Solar Beam, Fly) for two
 * rounds, on the assumption of one action per round: the lock simply runs out
 * at the end of the second. An enemy with an extra move can charge and release
 * in the same round; the lock would then outlive the move by a round and make
 * it charge again. When the move has been released in the round it was
 * charged, the lock is lifted here.
 */
function releaseSpentCharge(pokemon: Pokemon): void {
  const hold = pokemon.volatiles.twoturnmove as { move?: string; duration?: number } | undefined
  if (!hold?.move || hold.duration !== 2) return
  // The move's own marker is gone once it has been released.
  if (!pokemon.volatiles[hold.move]) pokemon.removeVolatile('twoturnmove')
}

export const lockActionOverrides = {
  runMove(this: Actions, move: string | ActiveMove, pokemon: Pokemon, targetLoc: number, options?: RunMoveOptions) {
    // The engine's own function lives on the prototype; this override sits on the instance.
    const engine = Object.getPrototypeOf(this) as Actions
    const requested = typeof move === 'string' ? toID(move) : move.id
    const locked = options?.externalMove ? null : lockedAction(pokemon)
    if (locked && locked.move !== requested) {
      engine.runMove.call(this, locked.move, pokemon, locked.targetLoc, { ...options, originalTarget: undefined })
    } else {
      engine.runMove.call(this, move, pokemon, targetLoc, options)
    }
    releaseSpentCharge(pokemon)
  },
}
