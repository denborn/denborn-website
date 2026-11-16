/**
 * Evolution (spec section 3; decisions 7, 168 and 169): never forced, asked
 * for by the character's player. A level evolution is offered from its level;
 * a stone evolution spends the stone, a trade evolution the Linking Cord. The
 * campaign's list of playable Pokémon does not limit it (decision 168).
 */
import type { DataPack, Evolution, SpeciesData } from '../data/types.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import { countOf, withFewer } from './bag.ts'
import { type Changed, revised } from './changed.ts'
import { maxHpOf } from './character-check.ts'

/** An evolution the character's species has, and what it still lacks when it cannot happen now. */
export interface EvolutionOffer extends Evolution {
  missing?: 'level' | 'item'
}

function missingFor(character: CharacterDocument, evolution: Evolution): EvolutionOffer['missing'] {
  if (evolution.method === 'level') return character.level >= (evolution.level ?? 0) ? undefined : 'level'
  // A stone, or the Linking Cord: one of it in the character's own Bag.
  return evolution.item !== undefined && countOf(character.bag, evolution.item) > 0 ? undefined : 'item'
}

/** Every evolution of the character's species into a Pokémon the game data has. */
export function evolutionOffers(character: CharacterDocument, pack: DataPack): EvolutionOffer[] {
  const species = pack.species[character.species]
  if (!species) return []
  return species.evolutions
    .filter((evolution) => evolution.to in pack.species)
    .map((evolution) => {
      const missing = missingFor(character, evolution)
      return missing ? { ...evolution, missing } : { ...evolution }
    })
}

/**
 * The Ability a Pokémon has once evolved, as in the games (decision 169): it
 * keeps its place. A hidden Ability becomes the new form's hidden one; a first
 * or second Ability its first or second; where the new form has no such
 * place, it gets the first.
 */
export function abilityAfterEvolving(ability: string, from: SpeciesData, to: SpeciesData): string {
  const ordinary = (species: SpeciesData): string[] => species.abilities.filter((other) => other !== species.hiddenAbility)
  const first = ordinary(to)[0] ?? to.abilities[0] ?? ability
  if (ability === from.hiddenAbility) return to.hiddenAbility ?? first
  return ordinary(to)[ordinary(from).indexOf(ability)] ?? first
}

export type EvolutionProblem =
  /** A dead character does not evolve until it is brought back. */
  | 'dead'
  | 'no-such-evolution'
  | 'level'
  | 'item'

/**
 * The character evolved into `to`: its species and its Ability change, its
 * stats follow, and its HP rises by what its maximum gained (a Pokémon at 0
 * HP stays there). The stone or the Linking Cord is spent. Its name, level,
 * moves and everything else stay: new moves are chosen at the next rest.
 */
export function evolved(character: CharacterDocument, to: string, pack: DataPack): Changed<EvolutionProblem> {
  if (character.condition.state === 'dead') return { ok: false, problem: 'dead' }
  const from = pack.species[character.species]
  const target = pack.species[to]
  const offer = evolutionOffers(character, pack).find((evolution) => evolution.to === to)
  if (!from || !target || !offer) return { ok: false, problem: 'no-such-evolution' }
  if (offer.missing) return { ok: false, problem: offer.missing }

  const bag = offer.method === 'level' || offer.item === undefined ? character.bag : withFewer(character.bag, offer.item, 1)
  if (!bag) return { ok: false, problem: 'item' }
  const next = revised(character, { species: target.id, ability: abilityAfterEvolving(character.ability, from, target), bag: [...bag] })
  const before = maxHpOf(character, pack)
  const after = maxHpOf(next, pack)
  if (character.hp === 0 || before === undefined || after === undefined) return { ok: true, character: next }
  return { ok: true, character: { ...next, hp: Math.max(1, Math.min(after, character.hp + (after - before))) } }
}
