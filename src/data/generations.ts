/**
 * The generation a species was brought in by, from its National Pokédex
 * number: the number each generation's Pokémon start at, in the games' own
 * order. A form takes its species' number, so it counts with the species it is
 * a form of (decision 300).
 */
const FIRST_OF_GENERATION = [1, 152, 252, 387, 494, 650, 722, 810, 906] as const

/** 1 to 9; 0 for a number before the first. */
export function generationOf(num: number): number {
  return FIRST_OF_GENERATION.filter((first) => num >= first).length
}
