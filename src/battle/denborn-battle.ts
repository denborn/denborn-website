/**
 * Denborn's battle, on top of Pokémon Showdown's simulator.
 *
 * This is the only door into the engine. Only the GM's device runs it. The
 * engine does all battle maths; this class turns locked actions into engine
 * actions, applies the owner's overrides (lines of any length, Agony, Bag,
 * Speed exchange, extra enemy moves) and reports what happened.
 *
 * Who may do what (consent for a swap, the timer, whose turn it is to choose)
 * is decided by the GM's session, not here. This class refuses what the rules
 * of the fight itself forbid.
 */
import { Battle, extractChannelMessages, toID } from '@pkmn/sim'
import type { Pokemon, PokemonSet, Side } from '@pkmn/sim'
import type { BagUse, MajorStatus } from '../game-rules/bag-effects'
import type { LineSide } from '../game-rules/reach'
import { type SetExtras, assertDenbornBattle, registerDenborn } from './engine/format'
import { lockedAction } from './engine/locks'
import { swapSlots } from './engine/positions'
import { type CombatantState, findCombatant, sideOf, stateOf } from './engine/state'
import { clearSpeedExchanges, exchangeTurnOrderSpeed } from './engine/turn-order'
import { ADAPTER_VERSION, ENGINE_VERSION, FORMAT_ID } from './versions'

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

// ---------------------------------------------------------------------------

const SIDE_NAMES: Record<LineSide, string> = { players: 'players', enemies: 'enemies' }
const MAX_LINE = 6
const MAX_MOVES = 6

/** Kinds of move for which the target is chosen when the action is locked. Engine: BattleActions.targetTypeChoices. */
const CHOSEN_TARGET_KINDS: ReadonlySet<string> = new Set([
  'normal',
  'any',
  'adjacentAlly',
  'adjacentAllyOrSelf',
  'adjacentFoe',
])

interface QueuedAction {
  choice: 'move' | 'event'
  pokemon: Pokemon
  moveid?: string
  targetLoc?: number
  event?: string
  priority?: number
  subOrder?: number
}

function push(side: Side, action: QueuedAction): void {
  ;(side.choice.actions as unknown as QueuedAction[]).push(action)
}

function fail(code: string, message: string, combatant?: string): never {
  throw new BattleRuleError(code, message, combatant)
}

function validateSetup(setup: BattleSetup): void {
  const ids = new Set<string>()
  for (const [label, line] of [
    ['players', setup.players],
    ['enemies', setup.enemies],
  ] as const) {
    if (line.length < 1 || line.length > MAX_LINE) {
      fail('line-size', `The ${label} line needs 1 to ${MAX_LINE} Pokémon, not ${line.length}`)
    }
    for (const combatant of line) {
      const { id } = combatant
      // Ids travel through the engine's log, where "|" separates fields and "[...]" marks references.
      if (!id || /[|[\]\n]/.test(id)) fail('bad-id', `"${id}" cannot be used as a combatant id`, id)
      if (ids.has(id)) fail('duplicate-id', `Two combatants share the id "${id}"`, id)
      ids.add(id)
      if (!Number.isInteger(combatant.level) || combatant.level < 1 || combatant.level > 100) {
        fail('bad-level', `Level must be 1 to 100, not ${combatant.level}`, id)
      }
      if (combatant.moves.length < 1 || combatant.moves.length > MAX_MOVES) {
        fail('move-count', `A Pokémon needs 1 to ${MAX_MOVES} moves, not ${combatant.moves.length}`, id)
      }
      if (combatant.hp !== undefined && combatant.hp < 1) {
        fail('no-hp', 'A Pokémon at 0 HP sits the encounter out and cannot be placed on a line', id)
      }
    }
  }
}

function toSet(combatant: CombatantSetup, name: string): PokemonSet {
  const extras: SetExtras = {
    id: combatant.id,
    agony: combatant.agony,
    ppUps: combatant.moves.map((move) => move.ppUps ?? 0),
    pp: combatant.moves.map((move) => move.pp),
  }
  if (combatant.hp !== undefined) extras.hp = combatant.hp
  if (combatant.status !== undefined) extras.status = combatant.status
  const set: PokemonSet & { denborn: SetExtras } = {
    // The engine cuts names at 20 characters, so it gets a short key; nicknames stay in the interface.
    name,
    species: combatant.species,
    item: combatant.item ?? '',
    ability: combatant.ability,
    moves: combatant.moves.map((move) => move.id),
    nature: combatant.nature,
    gender: combatant.gender,
    evs: { ...combatant.evs },
    ivs: { ...combatant.ivs },
    level: combatant.level,
    denborn: extras,
  }
  return set
}

function parseEvent(line: string): DenbornEvent | null {
  const [, tag, type, ...rest] = line.split('|')
  if (tag !== 'denborn') return null
  const [a = '', b = '', c = '', d = ''] = rest
  switch (type) {
    case 'downed':
      return { type, id: a, stacks: Number(b) }
    case 'fainted':
    case 'died':
      return { type, id: a }
    case 'agonizing':
      return { type, id: a, stacks: Number(b) }
    case 'agonyhit':
      return { type, id: a, stacks: Number(b), capped: c === 'capped' }
    case 'revived':
      return { type, id: a, hp: Number(b) }
    case 'bag':
      return { type, user: a, item: b, target: c, outcome: d as BagOutcome }
    case 'pp':
      return { type, id: a, move: b, pp: Number(c) }
    default:
      throw new Error(`Unknown Denborn event in the battle log: ${line}`)
  }
}

export class DenbornBattle {
  /** What happened when the Pokémon entered: Abilities that trigger on entry, carried status. */
  readonly opening: RoundResult

  private readonly battle: Battle
  private cursor: number

  private constructor(battle: Battle, cursor: number) {
    this.battle = battle
    this.cursor = cursor
    this.opening = this.drain()
  }

  static start(setup: BattleSetup): DenbornBattle {
    registerDenborn()
    validateSetup(setup)

    const battle = new Battle({ formatid: toID(FORMAT_ID), seed: setup.seed as never, debug: setup.debug ?? false })
    assertDenbornBattle(battle)
    for (const line of [setup.players, setup.enemies]) {
      for (const combatant of line) {
        if (!battle.dex.species.get(combatant.species).exists) {
          fail('unknown-species', `Unknown species "${combatant.species}"`, combatant.id)
        }
        if (!battle.dex.abilities.get(combatant.ability).exists) {
          fail('unknown-ability', `Unknown Ability "${combatant.ability}"`, combatant.id)
        }
        if (combatant.item && !battle.dex.items.get(combatant.item).exists) {
          fail('unknown-item', `Unknown item "${combatant.item}"`, combatant.id)
        }
        for (const move of combatant.moves) {
          if (!battle.dex.moves.get(move.id).exists) fail('unknown-move', `Unknown move "${move.id}"`, combatant.id)
        }
      }
    }

    battle.setPlayer('p1', {
      name: SIDE_NAMES.players,
      team: setup.players.map((combatant, index) => toSet(combatant, `P${index + 1}`)),
    })
    // The battle starts by itself once both sides are in: the Pokémon enter and the first round opens.
    battle.setPlayer('p2', {
      name: SIDE_NAMES.enemies,
      team: setup.enemies.map((combatant, index) => toSet(combatant, `E${index + 1}`)),
    })
    return new DenbornBattle(battle, 0)
  }

  /**
   * Rebuilds a battle from a snapshot. It resumes only under the engine and
   * adapter versions it was saved with: anything else could play out
   * differently, so it is refused rather than guessed.
   */
  static restore(snapshot: BattleSnapshot): DenbornBattle {
    if (snapshot.engine !== ENGINE_VERSION || snapshot.adapter !== ADAPTER_VERSION || snapshot.format !== FORMAT_ID) {
      fail(
        'snapshot-version',
        `This battle was saved with engine ${snapshot.engine}, adapter ${snapshot.adapter}, format ${snapshot.format}; ` +
          `this app runs engine ${ENGINE_VERSION}, adapter ${ADAPTER_VERSION}, format ${FORMAT_ID}`,
      )
    }
    registerDenborn()
    const battle = Battle.fromJSON(JSON.stringify(snapshot.state))
    assertDenbornBattle(battle)
    // The engine reports through this callback; the adapter reads the log instead.
    battle.restart(() => undefined)
    return new DenbornBattle(battle, snapshot.cursor)
  }

  /** Everything needed to resume this battle later. Take it between rounds. */
  snapshot(): BattleSnapshot {
    return {
      engine: ENGINE_VERSION,
      adapter: ADAPTER_VERSION,
      format: FORMAT_ID,
      cursor: this.cursor,
      // A deep copy: the engine's own serialised form shares arrays with the running battle.
      state: JSON.parse(JSON.stringify(this.battle.toJSON())) as unknown,
    }
  }

  /** The round being chosen, starting at 1. */
  get round(): number {
    return this.battle.turn
  }

  get ended(): boolean {
    return this.battle.ended
  }

  get outcome(): Outcome | null {
    if (!this.battle.ended) return null
    if (this.battle.winner === SIDE_NAMES.players) return 'players'
    if (this.battle.winner === SIDE_NAMES.enemies) return 'enemies'
    return 'tie'
  }

  combatants(): CombatantView[] {
    return this.battle.getAllPokemon().map((pokemon) => this.view(pokemon))
  }

  combatant(id: string): CombatantView {
    return this.view(this.find(id))
  }

  /** The combatant a protocol identity such as "p1a: P2" or "p2: E1" refers to. */
  whoIs(identity: string): string | undefined {
    const match = /^(p[12])[a-f]?: (.+)$/.exec(identity)
    if (!match) return undefined
    const [, sideId, name] = match
    const pokemon = this.battle.getAllPokemon().find((other) => other.side.id === sideId && other.name === name)
    return pokemon ? stateOf(pokemon).id : undefined
  }

  /** What the Pokémon may lock this round. */
  request(id: string): ActionRequest {
    const pokemon = this.find(id)
    if (pokemon.fainted || this.battle.ended) return { canAct: false, forced: null, moves: [] }
    return { canAct: true, forced: lockedAction(pokemon)?.move ?? null, moves: this.moveOptions(pokemon) }
  }

  /**
   * Run: the Pokémon takes the slot at `position` on its own line, trading
   * places with whoever stands there. Between rounds only.
   */
  run(id: string, position: number): void {
    this.assertChoosing()
    const mover = this.find(id)
    const state = stateOf(mover)
    if (mover.fainted) fail('cannot-run', 'A downed or dead Pokémon cannot Run', id)
    const occupant = mover.side.active[position]
    if (!occupant) fail('no-such-slot', `There is no slot ${position} on that line`, id)
    if (occupant === mover) return
    if (stateOf(occupant).downed) fail('downed-ally', 'Nobody trades places with a downed ally', state.id)
    swapSlots(this.battle, mover, occupant)
  }

  /** Switch: two allies exchange their Speed for turn order, for this round only. */
  exchangeSpeed(firstId: string, secondId: string): void {
    this.assertChoosing()
    const first = this.find(firstId)
    const second = this.find(secondId)
    if (first === second) fail('same-pokemon', 'A Speed exchange needs two different Pokémon', firstId)
    if (first.side !== second.side) fail('not-allies', 'Only allies exchange Speed', firstId)
    for (const pokemon of [first, second]) {
      if (pokemon.fainted) fail('cannot-switch', 'A downed or dead Pokémon cannot exchange Speed', stateOf(pokemon).id)
    }
    exchangeTurnOrderSpeed(first, second)
  }

  /** Plays the round with every action locked, and returns what happened. */
  resolveRound(input: RoundInput): RoundResult {
    this.assertChoosing()
    const battle = this.battle
    this.checkInput(input)

    try {
      for (const side of battle.sides) this.submit(side, input)
      battle.commitChoices()
    } catch (error) {
      // Nothing was played if a choice was refused: leave the round as it was before.
      if (error instanceof BattleRuleError) this.resetRound()
      throw error
    }

    this.resetRound()
    clearSpeedExchanges(battle)
    return this.drain()
  }

  // -------------------------------------------------------------------------

  private find(id: string): Pokemon {
    const pokemon = findCombatant(this.battle, id)
    if (!pokemon) fail('unknown-combatant', `No combatant "${id}" in this battle`, id)
    return pokemon
  }

  private assertChoosing(): void {
    if (this.battle.ended) fail('battle-over', 'The battle is over')
    if (this.battle.requestState !== 'move') {
      throw new Error(`The engine is waiting for "${this.battle.requestState}", which Denborn never asks for`)
    }
  }

  private view(pokemon: Pokemon): CombatantView {
    const state: CombatantState = stateOf(pokemon)
    const boosts: Record<string, number> = {}
    for (const [stat, stages] of Object.entries(pokemon.boosts)) {
      if (stages !== 0) boosts[stat] = stages
    }
    return {
      id: state.id,
      side: sideOf(pokemon),
      position: pokemon.position,
      species: pokemon.species.id,
      hp: pokemon.hp,
      maxHp: pokemon.maxhp,
      status: pokemon.status,
      downed: state.downed,
      dead: state.dead,
      stacks: state.stacks,
      item: pokemon.item,
      ability: pokemon.ability,
      boosts,
      volatiles: Object.keys(pokemon.volatiles),
      moves: pokemon.baseMoveSlots.map((slot) => ({ id: slot.id, pp: slot.pp, maxPp: slot.maxpp })),
    }
  }

  private moveOptions(pokemon: Pokemon): MoveOption[] {
    const everyone = this.battle.getAllPokemon()
    const moves = pokemon.getMoves()
    if (!moves.length) {
      // No move can be used: the engine leaves Struggle as the only one.
      return [{ id: 'struggle', pp: 1, maxPp: 1, disabled: false, target: 'randomNormal', needsTarget: false, targets: [] }]
    }
    return moves.map((move) => {
      const target = move.target ?? 'normal'
      const needsTarget = CHOSEN_TARGET_KINDS.has(target)
      const targets = needsTarget
        ? everyone
            .filter((other) => !stateOf(other).dead && this.battle.validTarget(other, pokemon, target))
            .map((other) => stateOf(other).id)
        : []
      return {
        id: move.id,
        pp: move.pp ?? 0,
        maxPp: move.maxpp ?? 0,
        disabled: Boolean(move.disabled),
        target,
        needsTarget,
        targets,
      }
    })
  }

  /** Refuses the whole round, before anything is played, if any locked action breaks a rule. */
  private checkInput(input: RoundInput): void {
    const battle = this.battle
    for (const id of [...Object.keys(input.actions), ...Object.keys(input.extraMoves ?? {})]) this.find(id)

    for (const pokemon of battle.getAllPokemon()) {
      const { id } = stateOf(pokemon)
      const action = input.actions[id]
      const extras = input.extraMoves?.[id] ?? []

      if (pokemon.fainted) {
        if (action || extras.length) fail('cannot-act', 'A downed or dead Pokémon cannot act', id)
        continue
      }
      const locked = lockedAction(pokemon)
      if (locked) {
        if (action) fail('locked', `This Pokémon is locked into ${locked.move} and has no choice this round`, id)
      } else if (!action) {
        fail('no-action', 'Every standing Pokémon needs an action', id)
      } else if (action.type === 'move') {
        this.checkMove(pokemon, action)
      } else if (action.type === 'bag') {
        this.checkBag(action.use, id)
      }

      if (extras.length && sideOf(pokemon) !== 'enemies') {
        fail('extra-moves', 'Only enemies can be given extra moves', id)
      }
      for (const extra of extras) this.checkMove(pokemon, extra)
    }
  }

  private checkMove(pokemon: Pokemon, choice: MoveChoice): void {
    const { id } = stateOf(pokemon)
    const moveId = toID(choice.move)
    // An extra move is checked against the Pokémon's own moves even while it is locked into another.
    const option = this.moveOptions(pokemon).find((candidate) => candidate.id === moveId)
    if (!option) fail('unknown-move', `This Pokémon does not know ${choice.move}`, id)
    if (option.disabled) fail('move-disabled', `${choice.move} cannot be used right now`, id)

    if (!option.needsTarget) {
      if (choice.target !== undefined) fail('no-target', `${choice.move} does not take a chosen target`, id)
    } else if (!option.targets.length) {
      // Decision 69: a move that needs a target cannot be locked while nobody is in its reach.
      fail('nobody-in-reach', `Nobody is in reach of ${choice.move}`, id)
    } else if (choice.target === undefined) {
      fail('target-required', `${choice.move} needs a target`, id)
    } else if (!option.targets.includes(choice.target)) {
      fail('bad-target', `${choice.move} cannot be aimed at that Pokémon from here`, id)
    }

    if (moveId === 'allyswitch') {
      const pair = choice.allySwitch
      if (!pair) fail('ally-switch', 'Ally Switch needs the two Pokémon who trade places', id)
      const [first, second] = pair.map((member) => this.find(member))
      if (!first || !second || first === second || first.side !== pokemon.side || second.side !== pokemon.side) {
        fail('ally-switch', 'Ally Switch trades the places of two different Pokémon of the user\'s own party', id)
      }
      if (first.fainted || second.fainted) fail('ally-switch', 'Ally Switch only moves standing Pokémon', id)
    } else if (choice.allySwitch) {
      fail('ally-switch', 'Only Ally Switch takes a pair of Pokémon', id)
    }
  }

  private checkBag(use: BagUse, user: string): void {
    if (use.effect.reviveAll) return
    const target = findCombatant(this.battle, use.target)
    if (!target) fail('bad-target', 'That Pokémon is not in this battle', user)
    if (stateOf(target).dead) fail('bad-target', 'No item works on a dead Pokémon', user)
  }

  private locOf(pokemon: Pokemon, choice: MoveChoice): number {
    return choice.target === undefined ? 0 : pokemon.getLocOf(this.find(choice.target))
  }

  /** Hands one side's locked actions to the engine, one slot at a time. */
  private submit(side: Side, input: RoundInput): void {
    const battle = this.battle
    const afterSlots: QueuedAction[] = []

    for (const pokemon of side.active) {
      const state = stateOf(pokemon)
      if (pokemon.fainted) {
        // Agony rule 3: from the round after it went down, a downed Pokémon's turn comes at its Speed.
        if (state.downed && state.downedRound < battle.turn) {
          afterSlots.push({ choice: 'event', event: 'DenbornAgony', pokemon, priority: 0 })
        }
        continue
      }

      // The engine fills the slots in order, passing over Pokémon at 0 HP by itself.
      if (side.getChoiceIndex() !== pokemon.position) {
        throw new Error(`The engine expects a choice for another slot than ${state.id}'s`)
      }

      const locked = lockedAction(pokemon)
      const action = input.actions[state.id]
      if (locked) {
        // Engine: Side.chooseMove pushes exactly this for a locked Pokémon.
        push(side, { choice: 'move', pokemon, moveid: locked.move, targetLoc: locked.targetLoc })
      } else if (action?.type === 'move') {
        if (action.allySwitch) state.allySwitch.push(action.allySwitch)
        // The engine's own check: PP, Disable, Taunt, Choice items, reach.
        if (!side.chooseMove(toID(action.move), this.locOf(pokemon, action))) {
          fail('engine-refused', side.choice.error, state.id)
        }
      } else if (action?.type === 'bag') {
        state.bag = action.use
        // Priority +1: after +2 moves, in Speed order among +1 actions, before every ordinary move.
        push(side, { choice: 'event', event: 'DenbornBag', pokemon, priority: 1 })
      } else {
        // Engine: Side.chooseMove pushes exactly this when a Pokémon has no usable move.
        push(side, { choice: 'move', pokemon, moveid: 'struggle' })
      }

      for (const [index, extra] of (input.extraMoves?.[state.id] ?? []).entries()) {
        if (extra.allySwitch) state.allySwitch.push(extra.allySwitch)
        afterSlots.push({
          choice: 'move',
          pokemon,
          moveid: toID(extra.move),
          targetLoc: this.locOf(pokemon, extra),
          // Decision 61: among one enemy's moves of equal priority, the order they were entered in.
          subOrder: index + 1,
        })
      }
    }

    // Pass over Pokémon at 0 HP in the last slots, then add what does not belong to a slot.
    side.getChoiceIndex()
    for (const action of afterSlots) push(side, action)
  }

  /** Forgets everything that only lasts for one round's choices. */
  private resetRound(): void {
    for (const pokemon of this.battle.getAllPokemon()) {
      const state = stateOf(pokemon)
      state.bag = null
      state.allySwitch = []
    }
    if (!this.battle.ended && this.battle.requestState === 'move') {
      for (const side of this.battle.sides) side.clearChoice()
    }
  }

  private drain(): RoundResult {
    const fresh = this.battle.log.slice(this.cursor)
    this.cursor = this.battle.log.length
    // Channel -1 is the engine's "nothing hidden" view.
    const log = extractChannelMessages(fresh.join('\n'), [-1])[-1].filter(
      (line) => line !== '' && line !== '|' && !line.startsWith('|t:|'),
    )
    const events = log.map(parseEvent).filter((event) => event !== null)
    return { log, events }
  }
}
