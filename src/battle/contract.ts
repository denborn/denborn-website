/**
 * What goes in and out of Denborn's battle: the setup, the actions, the views
 * and the events, as plain data. Nothing here loads the engine, so the game
 * master's session and the players' screens can speak these words without
 * downloading it; `denborn-battle.ts` is the one that plays.
 */
import type { BagUse, MajorStatus } from '../game-rules/bag-effects'
import type { LineSide } from '../game-rules/reach'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export type StatId = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe'
export type Stats = Record<StatId, number>
export type Gender = 'M' | 'F' | 'N'

export interface MoveSetup {
  id: string
  /** PP Ups spent on this move (0 to 3). Defaults to 0: base PP. */
  ppUps?: number
  /** Current PP. Defaults to the move's maximum. */
  pp?: number
}

export interface CombatantSetup {
  /** Stable id of the character or enemy. */
  id: string
  species: string
  level: number
  gender: Gender
  ability: string
  nature: string
  item?: string
  ivs: Stats
  evs: Stats
  /** One to six moves. */
  moves: MoveSetup[]
  /** Current HP carried into the battle. Defaults to full. A Pokémon at 0 HP sits the encounter out. */
  hp?: number
  status?: MajorStatus
  /** True when 0 HP means Agony: always for players, per enemy for the GM. */
  agony: boolean
}

export interface BattleSetup {
  /** Seed of the engine's random numbers, four 16-bit numbers joined by commas. Same seed, same battle. */
  seed: string
  /** In line order, left to right as seen at the table. */
  players: CombatantSetup[]
  enemies: CombatantSetup[]
  /** Adds the engine's debug lines to the log. */
  debug?: boolean
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface MoveChoice {
  move: string
  /** Combatant id of the target, for moves that take a chosen target. */
  target?: string
  /** For the move Ally Switch: the two party members who trade places. */
  allySwitch?: [string, string]
}

export type RoundAction =
  | ({ type: 'move' } & MoveChoice)
  | { type: 'bag'; use: BagUse }
  /** WAIT (decisions 137 and 144): the Pokémon's turn passes, and it does nothing. */
  | { type: 'wait' }
  /** Struggle against a random foe in reach: a timeout, or an absent player. */
  | { type: 'struggle' }

export interface RoundInput {
  /** One action per standing Pokémon that has a choice, by combatant id. */
  actions: Record<string, RoundAction>
  /** Extra moves the GM gives an enemy this round, in the order they were entered. */
  extraMoves?: Record<string, MoveChoice[]>
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface MoveView {
  id: string
  pp: number
  maxPp: number
}

export interface CombatantView {
  id: string
  side: LineSide
  /** 0-based slot on its line, from the left. */
  position: number
  /** Species currently shown (differs from the character's own while transformed). */
  species: string
  hp: number
  maxHp: number
  status: string
  downed: boolean
  dead: boolean
  stacks: number
  item: string
  ability: string
  /** Stat stages that are not zero. */
  boosts: Record<string, number>
  /** Battle-only effects currently on the Pokémon, by engine id. */
  volatiles: string[]
  /** The character's own moves with their PP, as they should be saved after the battle. */
  moves: MoveView[]
}

/** Something in effect: a weather, a screen, what sits on a Pokémon. */
export interface EffectView {
  /** The engine's id of the effect. */
  id: string
  /** The turns it still lasts, when it ends by itself. */
  turns?: number
  /** How many layers of it there are, for what can be laid several times (Spikes). */
  layers?: number
}

/** Everything in effect on the battlefield (decisions 89 and 92 to 94). */
export interface FieldView {
  weather?: EffectView
  terrain?: EffectView
  /** What holds over the whole field besides the weather and the terrain: Trick Room, Gravity. */
  rooms: EffectView[]
  /** Each side's conditions: screens, Tailwind, hazards. */
  sides: Record<LineSide, EffectView[]>
  /** What sits on one Pokémon, by its id. Stat changes are in its own view. */
  pokemon: Record<string, EffectView[]>
}

export interface MoveOption extends MoveView {
  disabled: boolean
  /** How the move picks its target, in the engine's vocabulary. */
  target: string
  /** True when a target has to be chosen for this move. */
  needsTarget: boolean
  /**
   * Combatant ids that can be chosen as target. When a target is needed and
   * nobody is in reach, the move cannot be locked (decision 69).
   */
  targets: string[]
}

export interface ActionRequest {
  /** False for a downed or dead Pokémon. */
  canAct: boolean
  /** The move the Pokémon is locked into (a rampage, a charging move, a recharge). It then has no choice. */
  forced: string | null
  moves: MoveOption[]
}

export type BagOutcome = 'used' | 'failed' | 'blocked'

/** What Denborn's own rules did during a round. Wording is the interface's business. */
export type DenbornEvent =
  | { type: 'downed'; id: string; stacks: number }
  | { type: 'fainted'; id: string }
  | { type: 'agonizing'; id: string; stacks: number }
  | { type: 'agonyhit'; id: string; stacks: number; capped: boolean }
  | { type: 'died'; id: string }
  | { type: 'revived'; id: string; hp: number }
  | { type: 'bag'; user: string; item: string; target: string; outcome: BagOutcome }
  | { type: 'pp'; id: string; move: string; pp: number }
  /** A Pokémon that waited: its turn came, nothing stopped it, and it did nothing. */
  | { type: 'wait'; id: string }

export interface RoundResult {
  /** The engine's protocol lines for the round, with nothing hidden, Denborn's own lines included in order. */
  log: string[]
  events: DenbornEvent[]
}

export type Outcome = 'players' | 'enemies' | 'tie'

export interface BattleSnapshot {
  engine: string
  adapter: number
  format: string
  /** How many engine log lines have already been handed out. */
  cursor: number
  /** The engine's own serialised state. */
  state: unknown
}

/** A locked action or a setup that the rules of the fight do not allow. */
export class BattleRuleError extends Error {
  readonly code: string
  readonly combatant: string | undefined

  constructor(code: string, message: string, combatant?: string) {
    super(message)
    this.name = 'BattleRuleError'
    this.code = code
    this.combatant = combatant
  }
}
