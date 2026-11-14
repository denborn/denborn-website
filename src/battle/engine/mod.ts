/**
 * The `denborn` data mod: Gen 9 with the few moves and Abilities whose own
 * code assumes the stock line layout or a bench replaced.
 *
 * Everything else is inherited from Gen 9 untouched.
 */
import type { Battle, Pokemon } from '@pkmn/sim'
import { isDirectlyOpposite } from '../../game-rules/reach'
import { swapSlots } from './positions'
import { findCombatant, spotOf, stateOf } from './state'

export const modData = {
  Scripts: { inherit: 'gen9', gen: 9 },

  Moves: {
    /**
     * Decisions 48 and 65: the user picks any two standing Pokémon of its own
     * party, itself or not, and they trade places. The engine's version swaps
     * the user with the far end of the line.
     *
     * The pair is chosen when the action is locked. Without one (the move was
     * called by another move, for instance) there is nothing to swap and the
     * move fails.
     */
    allyswitch: {
      inherit: true,
      onHit(this: Battle, pokemon: Pokemon) {
        const pair = stateOf(pokemon).allySwitch.shift()
        const first = pair ? findCombatant(this, pair[0]) : undefined
        const second = pair ? findCombatant(this, pair[1]) : undefined
        const allowed =
          first !== undefined &&
          second !== undefined &&
          first !== second &&
          first.side === pokemon.side &&
          second.side === pokemon.side &&
          !first.fainted &&
          !second.fainted
        if (!allowed) {
          this.add('-fail', pokemon, 'move: Ally Switch')
          this.attrLastMove('[still]')
          return this.NOT_FAIL
        }
        swapSlots(this, first, second, '[from] move: Ally Switch')
        return undefined
      },
    },

    /**
     * Only revival items bring a downed Pokémon back (Agony rule 5). The
     * engine's version also needs a bench to choose from, which Denborn has not.
     */
    revivalblessing: {
      inherit: true,
      onTryHit() {
        return false
      },
    },
  },

  Abilities: {
    /**
     * Decision 47: Ditto copies the foe standing exactly opposite, and does
     * nothing when no foe stands there. The engine's version counts slots from
     * the far end of a line as long as its own.
     */
    imposter: {
      inherit: true,
      onSwitchIn(this: Battle, pokemon: Pokemon) {
        const from = spotOf(pokemon)
        const target = pokemon.side.foes().find((foe) => isDirectlyOpposite(from, spotOf(foe)))
        if (target) pokemon.transformInto(target, this.dex.abilities.get('imposter'))
      },
    },
  },
}
