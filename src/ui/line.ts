/** Walking along a battle line, one Pokémon at a time. */

/** `gone` is the empty slot a dead Pokémon leaves: it stays on the line, but there is nothing to show. */
export type FieldState = 'standing' | 'downed' | 'gone'

/**
 * The slot the arrows lead to from `from`, one way (`step` 1, to the right) or
 * the other (-1): the nearest that still holds a Pokémon. The line does not
 * wrap around: past its last Pokémon there is nowhere to go.
 */
export function neighbourSlot(states: readonly FieldState[], from: number, step: 1 | -1): number | undefined {
  for (let index = from + step; index >= 0 && index < states.length; index += step) {
    if (states[index] !== 'gone') return index
  }
  return undefined
}
