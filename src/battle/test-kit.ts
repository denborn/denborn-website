/**
 * Helpers shared by the engine tests. Not part of the app.
 *
 * Every Pokémon built here also knows Splash, so a test only spells out the
 * actions it is about: everyone else splashes.
 */
import { Dex, toID } from '@pkmn/sim'
import type { BagEffect, BagUse } from '../game-rules/bag-effects'
import {
  type BattleSetup,
  type CombatantSetup,
  DenbornBattle,
  type MoveChoice,
  type RoundAction,
  type RoundInput,
  type RoundResult,
} from './denborn-battle'

const FULL_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const NO_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

type Overrides = Partial<Omit<CombatantSetup, 'id' | 'species' | 'moves'>> & {
  /** Per-move PP or PP Ups, by move id. */
  pp?: Record<string, number>
  ppUps?: Record<string, number>
}

function build(id: string, species: string, moves: string[], agony: boolean, overrides: Overrides): CombatantSetup {
  const { pp, ppUps, ...rest } = overrides
  const list = moves.length < 6 && !moves.includes('splash') ? [...moves, 'splash'] : moves
  return {
    id,
    species,
    level: 50,
    // Genderless by default: no infatuation, and the engine draws no random gender.
    gender: 'N',
    ability: Dex.species.get(species).abilities[0],
    nature: 'Hardy',
    ivs: FULL_IVS,
    evs: NO_EVS,
    moves: list.map((move) => {
      const setup: CombatantSetup['moves'][number] = { id: move }
      const carried = pp?.[move]
      const ups = ppUps?.[move]
      if (carried !== undefined) setup.pp = carried
      if (ups !== undefined) setup.ppUps = ups
      return setup
    }),
    agony,
    ...rest,
  }
}

/** A player's Pokémon: goes through Agony at 0 HP. */
export function player(id: string, species: string, moves: string[], overrides: Overrides = {}): CombatantSetup {
  return build(id, species, moves, true, overrides)
}

/** An enemy: faints as in the games unless `agony: true` is passed. */
export function enemy(id: string, species: string, moves: string[], overrides: Overrides = {}): CombatantSetup {
  return build(id, species, moves, false, overrides)
}

export function start(
  players: CombatantSetup[],
  enemies: CombatantSetup[],
  options: Partial<Pick<BattleSetup, 'seed' | 'debug'>> = {},
): DenbornBattle {
  return DenbornBattle.start({ seed: '1,2,3,4', players, enemies, ...options })
}

/** A seed well spread over the 16-bit range, for sweeps. */
export function seedNumber(n: number): string {
  return [7919, 104729, 1299709, 15485863].map((prime) => (n * prime) % 65536).join(',')
}

export const move = (id: string, target?: string): RoundAction =>
  target === undefined ? { type: 'move', move: id } : { type: 'move', move: id, target }

export const extra = (id: string, target?: string): MoveChoice =>
  target === undefined ? { move: id } : { move: id, target }

export const struggle: RoundAction = { type: 'struggle' }

export const wait: RoundAction = { type: 'wait' }

export function bag(item: string, target: string, effect: BagEffect, moveId?: string): RoundAction {
  const use: BagUse = { item, target, effect }
  if (moveId !== undefined) use.move = moveId
  return { type: 'bag', use }
}

/** Plays a round in which every Pokémon not named in `actions` uses Splash. */
export function round(
  battle: DenbornBattle,
  actions: Record<string, RoundAction> = {},
  extraMoves?: RoundInput['extraMoves'],
): RoundResult {
  const filled: Record<string, RoundAction> = { ...actions }
  for (const combatant of battle.combatants()) {
    const request = battle.request(combatant.id)
    if (!request.canAct || request.forced || combatant.id in filled) continue
    filled[combatant.id] = move('splash')
  }
  return battle.resolveRound(extraMoves ? { actions: filled, extraMoves } : { actions: filled })
}

/**
 * What happened in a round, one short string per step, in order:
 * `move <who> <move> [<target>]`, `cant <who> <reason>`, and Denborn's own
 * events as `<type> <who> ...`.
 */
export function timeline(battle: DenbornBattle, result: RoundResult): string[] {
  const steps: string[] = []
  for (const line of result.log) {
    const [, kind = '', a = '', b = '', c = '', d = ''] = line.split('|')
    if (kind === 'move') {
      const target = battle.whoIs(c)
      steps.push(['move', battle.whoIs(a), toID(b), target].filter(Boolean).join(' '))
    } else if (kind === 'cant') {
      steps.push(`cant ${battle.whoIs(a) ?? a} ${b}`)
    } else if (kind === 'denborn') {
      steps.push([a, b, c, d].filter(Boolean).join(' '))
    }
  }
  return steps
}

/** HP lost since full health, by combatant id, for those who lost any. */
export function damaged(battle: DenbornBattle): string[] {
  return battle
    .combatants()
    .filter((combatant) => combatant.hp < combatant.maxHp)
    .map((combatant) => combatant.id)
    .sort()
}

export function eventsOf<T extends RoundResult['events'][number]['type']>(
  result: RoundResult,
  type: T,
): Extract<RoundResult['events'][number], { type: T }>[] {
  return result.events.filter((event): event is Extract<RoundResult['events'][number], { type: T }> => event.type === type)
}
