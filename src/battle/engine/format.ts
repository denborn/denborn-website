/**
 * Registers Denborn's battle format with the engine.
 *
 * The format sits on the engine's Doubles rules and carries every override.
 * The engine copies `battle`, `pokemon` and `actions` onto each object it
 * builds, including when it rebuilds a battle from a snapshot, so a restored
 * battle gets the same overrides as long as the format is registered first.
 */
import { Dex } from '@pkmn/sim'
import type { Battle, Pokemon } from '@pkmn/sim'
import { FORMAT_ID, FORMAT_NAME, MOD_ID } from '../versions'
import { agonyActionOverrides, agonyBattleOverrides, agonyHandlers } from './agony'
import { bagHandlers } from './bag'
import { battleTargetingOverrides, pokemonOverrides } from './lines'
import { lockActionOverrides } from './locks'
import { modData } from './mod'
import { newCombatantState } from './state'
import { waitHandlers } from './turn'
import { turnOrderOverrides } from './turn-order'

/** What the adapter attaches to each Pokémon's set for the battle's setup. Plain data. */
export interface SetExtras {
  id: string
  agony: boolean
  /** Current HP carried into the battle; full when absent. */
  hp?: number
  /** Status condition carried into the battle. */
  status?: string
  /** PP Ups spent on each move, in the order of the set's moves. */
  ppUps: number[]
  /** Current PP of each move; full when absent. */
  pp: (number | undefined)[]
}

function extrasOf(pokemon: Pokemon): SetExtras {
  const extras = (pokemon.set as { denborn?: SetExtras }).denborn
  if (!extras) throw new Error(`${pokemon.name} was not set up by the Denborn adapter`)
  return extras
}

function prepare(battle: Battle, pokemon: Pokemon): void {
  const extras = extrasOf(pokemon)
  pokemon.m.denborn = newCombatantState(extras.id, extras.agony)

  // No Terastallization, Mega Evolution or Z-moves in Denborn.
  pokemon.canTerastallize = null
  pokemon.canMegaEvo = null
  pokemon.canMegaEvoX = null
  pokemon.canMegaEvoY = null
  pokemon.canUltraBurst = null

  // The engine starts every move at its maximum PP, as if three PP Ups were spent on it.
  // Denborn starts at base PP and counts the PP Ups each move really has (decision 3).
  for (const [index, slot] of pokemon.baseMoveSlots.entries()) {
    const ppUps = extras.ppUps[index] ?? 0
    const max = battle.calculatePP(battle.dex.moves.get(slot.id), ppUps)
    pokemon.ppUps[index] = ppUps
    slot.maxpp = max
    slot.pp = Math.max(0, Math.min(extras.pp[index] ?? max, max))
  }

  // HP and status carry over between encounters (decision 58).
  if (extras.hp !== undefined) pokemon.hp = Math.max(1, Math.min(Math.floor(extras.hp), pokemon.maxhp))
  if (extras.status) enterWithStatus(battle, pokemon, extras.status)
}

/**
 * Gives a Pokémon the status condition it carries into the battle.
 *
 * The engine's own Pokemon.setStatus refuses a Pokémon that has not entered
 * yet, and no stock battle starts with a status. This does what setStatus does
 * once it has accepted a status, without the checks that decide whether a new
 * status may be inflicted: the condition was acquired earlier.
 *
 * The status's own start-up still runs, so the engine draws the length of a
 * sleep and restarts the count of a bad poisoning as it would for a new one.
 */
function enterWithStatus(battle: Battle, pokemon: Pokemon, status: string): void {
  const condition = battle.dex.conditions.get(status)
  if (!condition.exists) throw new Error(`Unknown status condition "${status}"`)
  pokemon.status = condition.id
  pokemon.statusState = battle.initEffectState({ id: condition.id, target: pokemon })
  pokemon.statusState.source = pokemon
  battle.singleEvent('Start', condition, pokemon.statusState, pokemon, pokemon, null)
}

const format = {
  name: FORMAT_NAME,
  mod: MOD_ID,
  gameType: 'doubles',
  ruleset: [],

  battle: { ...battleTargetingOverrides, ...agonyBattleOverrides, ...turnOrderOverrides },
  pokemon: pokemonOverrides,
  actions: { ...agonyActionOverrides, ...lockActionOverrides },

  /** Runs once, before any Pokémon enters: each line becomes as long as its own team. */
  onBegin(this: Battle) {
    for (const side of this.sides) {
      // Empty slots are null until the Pokémon enter, exactly as the engine builds them.
      side.active = side.pokemon.map(() => null) as unknown as Pokemon[]
      side.slotConditions = side.pokemon.map(() => ({}))
      for (const pokemon of side.pokemon) prepare(this, pokemon)
    }
  },

  ...agonyHandlers,
  ...bagHandlers,
  ...waitHandlers,
}

/** Registers the mod and the format. Safe to call any number of times. */
export function registerDenborn(): void {
  // The mod must exist before the format that names it, or the engine marks the format as missing.
  if (!(MOD_ID in Dex.dexes)) Dex.mod(MOD_ID, modData)
  if (!Dex.formats.get(FORMAT_ID).exists) Dex.formats.extend([format as never])
}

/** Throws unless `battle` really runs Denborn's format and data: the engine falls back silently otherwise. */
export function assertDenbornBattle(battle: Battle): void {
  if (!battle.format.exists || battle.format.id !== FORMAT_ID || battle.dex.currentMod !== MOD_ID) {
    throw new Error(
      `Battle is running "${battle.format.id}" on "${battle.dex.currentMod}" instead of "${FORMAT_ID}" on "${MOD_ID}"`,
    )
  }
}
