/**
 * Trading places on a line: Run (between rounds) and the move Ally Switch
 * (mid-round).
 *
 * The engine remembers targets as relative slot numbers (for a two-turn move,
 * a rampage, a queued action). When two Pokémon trade places those numbers are
 * rewritten here, so that every stored target keeps pointing at the same
 * Pokémon: targets follow the Pokémon (DECISIONS.md 1.1, "Actions").
 *
 * Effects the games attach to a slot (Wish, Future Sight) stay with the slot,
 * as the engine has them.
 */
import type { Battle, Pokemon, Side } from '@pkmn/sim'

/** Rewrites one stored location after slots `i` and `j` of `side` were swapped. */
function follow(loc: number | undefined, sign: 1 | -1, i: number, j: number): number | undefined {
  if (!loc || Math.sign(loc) !== sign) return loc
  const position = Math.abs(loc) - 1
  if (position === i) return sign * (j + 1)
  if (position === j) return sign * (i + 1)
  return loc
}

function rewriteStoredLocations(battle: Battle, side: Side, i: number, j: number): void {
  // Seen from its own side a slot is negative, from the other side positive.
  const signFor = (viewer: Pokemon): 1 | -1 => (viewer.side === side ? -1 : 1)

  for (const pokemon of battle.getAllPokemon()) {
    const sign = signFor(pokemon)
    pokemon.lastMoveTargetLoc = follow(pokemon.lastMoveTargetLoc, sign, i, j)
    for (const volatile of Object.values(pokemon.volatiles)) {
      if (typeof volatile.targetLoc === 'number') volatile.targetLoc = follow(volatile.targetLoc, sign, i, j)
    }
  }
  for (const action of battle.queue.list as { pokemon?: Pokemon; targetLoc?: number }[]) {
    if (action.pokemon && typeof action.targetLoc === 'number') {
      action.targetLoc = follow(action.targetLoc, signFor(action.pokemon), i, j)
    }
  }
}

/**
 * Swaps the slots of two Pokémon of the same side. Either may be standing,
 * downed or gone; who is allowed to trade places is the caller's rule.
 *
 * Engine: Battle.swapPosition, which refuses a fainted occupant and does not
 * rewrite stored locations.
 */
export function swapSlots(battle: Battle, a: Pokemon, b: Pokemon, attributes = ''): void {
  if (a.side !== b.side) throw new Error('Only two Pokémon of the same side can trade places')
  if (a === b) return
  const side = a.side
  const i = a.position
  const j = b.position

  battle.add('swap', a, j, attributes)
  side.pokemon[i] = b
  side.pokemon[j] = a
  side.active[i] = b
  side.active[j] = a
  a.position = j
  b.position = i
  rewriteStoredLocations(battle, side, i, j)

  battle.runEvent('Swap', b, a)
  battle.runEvent('Swap', a, b)
}
