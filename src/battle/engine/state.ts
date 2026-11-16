import type { Battle, Pokemon } from '@pkmn/sim'
import type { BagUse } from '../../game-rules/bag-effects'
import type { LineSide, Spot } from '../../game-rules/reach'

/**
 * Denborn's own state for one Pokémon in a battle. It lives on the engine's
 * Pokémon (`pokemon.m.denborn`) as plain data, so the engine's snapshot carries it.
 */
export interface CombatantState {
  /** Stable id of the character or enemy; the engine only knows a short slot name. */
  id: string
  /** True when 0 HP means Agony (players always, enemies when the GM switched it on). */
  agony: boolean
  downed: boolean
  /** Dead, or an enemy that fainted as in the games, until a revival item is used on it (decision 171). Its slot stays on the line. */
  dead: boolean
  /** Agony stacks left while downed. */
  stacks: number
  /** Round in which it went down (0 when it never has). */
  downedRound: number
  /** Last round in which an attack removed its one extra stack (0 when none has). */
  hitRound: number
  /** Id of the Pokémon whose turn-order Speed it acts with this round, after Switch exchanges. */
  speedOwner: string | null
  /** This round's Bag action, waiting in the queue. */
  bag: BagUse | null
  /** The pairs of party members its Ally Switch uses will swap this round, in the order the moves were entered. */
  allySwitch: [string, string][]
  /** Its Ability's and item's own state at the moment it went down, to pick up from on revival. */
  resume: ResumeState | null
}

export interface ResumeState {
  ability: string
  abilityState: Pokemon['abilityState']
  item: string
  itemState: Pokemon['itemState']
}

export function newCombatantState(id: string, agony: boolean): CombatantState {
  return {
    id,
    agony,
    downed: false,
    dead: false,
    stacks: 0,
    downedRound: 0,
    hitRound: 0,
    speedOwner: null,
    bag: null,
    allySwitch: [],
    resume: null,
  }
}

export function stateOf(pokemon: Pokemon): CombatantState {
  const state = pokemon.m.denborn as CombatantState | undefined
  if (state === undefined) throw new Error(`${pokemon.name} has no Denborn state`)
  return state
}

/** At 0 HP and going through Agony: still on the line, still hittable. */
export function isDowned(pokemon: Pokemon): boolean {
  return stateOf(pokemon).downed
}

/** Dead, or fainted as in the games: no move can target it any more. Only a revival item brings it back (decision 171). */
export function isGone(pokemon: Pokemon): boolean {
  return pokemon.fainted && !stateOf(pokemon).downed
}

/** Downed or dead: at 0 HP, where only a revival item does anything (decisions 171 and 172). */
export function isFallen(pokemon: Pokemon): boolean {
  return pokemon.fainted
}

export function sideOf(pokemon: Pokemon): LineSide {
  return pokemon.side.id === 'p1' ? 'players' : 'enemies'
}

export function spotOf(pokemon: Pokemon): Spot {
  return { side: sideOf(pokemon), position: pokemon.position, lineLength: pokemon.side.active.length }
}

export function findCombatant(battle: Battle, id: string): Pokemon | undefined {
  return battle.getAllPokemon().find((pokemon) => stateOf(pokemon).id === id)
}

/** Writes a Denborn event into the engine's log, in order with the engine's own lines. */
export function emit(battle: Battle, event: string, ...parts: (string | number)[]): void {
  battle.add('denborn', event, ...parts.map(String))
}
