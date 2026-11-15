/**
 * A fight at the table: an encounter being played, as the game master's
 * session runs it. The engine (src/battle) plays the rounds and knows where
 * everyone stands. This module is what happens around it while a round is
 * being chosen: who has locked what, the swaps that wait for the other's
 * consent, the timer, the items left, and the moment the round is played.
 *
 * The engine is handed in with each command; everything else is plain data:
 * a command goes in, the fight's next state comes out.
 */
import {
  type ActionRequest,
  BattleRuleError,
  type CombatantView,
  type DenbornEvent,
  type FieldView,
  type MoveChoice,
  type Outcome,
  type RoundAction,
  type RoundInput,
  type RoundResult,
} from '../../battle/contract'
import type { BagEffect, BagUse } from '../../game-rules/bag-effects'
import type { MobClass } from '../../game-rules/rewards'
import type { ItemStack } from '../../shared/schema/common'
import type { Enemy } from '../../shared/schema/encounter'

/** The battle, as far as the table drives it. `DenbornBattle` is the one that plays. */
export interface FightEngine {
  readonly round: number
  readonly ended: boolean
  readonly outcome: Outcome | null
  combatants(): CombatantView[]
  field(): FieldView
  request(id: string): ActionRequest
  checkAction(id: string, action: RoundAction, extras?: readonly MoveChoice[]): void
  /** The combatant a Pokémon named in the engine's log refers to, such as "p1a: P2". */
  whoIs(identity: string): string | undefined
  turnOrder(locked: Readonly<Record<string, RoundAction | undefined>>): string[]
  run(id: string, position: number): void
  exchangeSpeed(first: string, second: string): void
  resolveRound(input: RoundInput): RoundResult
}

/** What a Pokémon is given to do this round, in the table's words. */
export type Choice =
  | { do: 'move'; move: string; target?: string; allySwitch?: [string, string] }
  /** An item of its side's Bag, on any Pokémon on the field (decision 19); `move` names the move a PP item restores. */
  | { do: 'bag'; item: string; target: string; move?: string }
  /** Decision 137. */
  | { do: 'wait' }
  /** Not a player's to choose: what the timer gives who has not chosen, and what the game master may give an absent player (decision 16). */
  | { do: 'struggle' }

export interface Locked {
  choice: Choice
  /** An enemy's extra moves for the round, in the order the game master entered them (decision 61). */
  extra: MoveChoice[]
  /** Who locked it: the Pokémon's own side, the game master for an absent player, or the timer. */
  by: 'self' | 'gm' | 'timer'
}

/** A swap that waits for the other Pokémon's player to agree: trading places (Run) or Speed for the round (Switch). */
export interface Ask {
  kind: 'run' | 'switch'
  from: string
  to: string
}

export interface Timer {
  /** How long players get each round; nothing when the game master runs no timer. */
  seconds: number | undefined
  /** Stopped by the game master. */
  paused: boolean
  /** When it runs out, on the game master's clock; nothing while it does not run. */
  deadline: number | undefined
  /** Milliseconds left, while it does not run. */
  left: number
  /** It ran out this round: the players' choices are closed. */
  expired: boolean
}

export interface PlayedRound {
  /** The round that was played; 0 for the Pokémon entering. */
  round: number
  /** The engine's lines, in order, with each Pokémon named by its combatant id in the place of the engine's own name for it. */
  log: string[]
  events: DenbornEvent[]
  /** Everyone as they stood when the round began: where its playback starts from. */
  before: CombatantView[]
  /** The weather the round began under, by the engine's id: the line that ends a weather does not name it. */
  weather?: string
}

export interface Fight {
  encounter: { id: string; name: string }
  /** The enemies' sheets, as the encounter has them. */
  enemies: readonly Enemy[]
  /** The round being chosen. */
  round: number
  locked: Readonly<Record<string, Locked>>
  /** The Pokémon whose locked action was taken back this round and who have not locked again: a swap put their target out of reach. */
  takenBack: readonly string[]
  asks: readonly Ask[]
  timer: Timer
  /** What is left in each character's bag, by character. */
  bags: Readonly<Record<string, readonly ItemStack[]>>
  /** What is left in the Bag the enemies share. */
  enemyBag: readonly ItemStack[]
  /** What was played last, for whoever was not looking. */
  last: PlayedRound
  /** Set once the fight is over. */
  outcome: Outcome | undefined
}

/** Who speaks: the game master, or the player of one character. */
export type Author = 'gm' | { player: string }

export type FightCommand =
  | { do: 'lock'; who: string; choice: Choice; extra?: readonly MoveChoice[] }
  | { do: 'unlock'; who: string }
  /** Run: trade places with an ally. A living ally is asked first; a dead one's slot is free. */
  | { do: 'run'; who: string; with: string }
  /** Switch: exchange Speed with an ally for the round. The ally is asked first. */
  | { do: 'switch'; who: string; with: string }
  /** The answer of the Pokémon that was asked. */
  | { do: 'answer'; who: string; kind: Ask['kind']; from: string; accept: boolean }
  /** Takes one's own asks back. */
  | { do: 'withdraw'; who: string; kind: Ask['kind'] }
  /** The game master sets how long players get, or runs no timer. */
  | { do: 'timer'; seconds: number | undefined }
  | { do: 'pause' }
  | { do: 'resume' }
  /** Time passed, or someone came or went: the timer is looked at again. */
  | { do: 'clock' }
  /** Plays a round in which nobody is left to choose. A round is otherwise played by its last lock. */
  | { do: 'play' }

export interface FightContext {
  engine: FightEngine
  /** What an item does when used from a Bag; nothing for an item that does nothing there. */
  bagEffect: (item: string) => BagEffect | undefined
  /** The characters whose player is away right now. */
  absent: ReadonlySet<string>
  /** The game master's clock, in milliseconds. */
  now: number
}

/** Why a command was not carried out: one of these, or the code of the engine's own refusal. */
export type Refusal =
  | 'over'
  | 'unknown-combatant'
  | 'not-yours'
  /** The timer ran out: players choose no more this round. */
  | 'closed'
  /** Run and Switch are for a Pokémon that has not locked: it unlocks first. */
  | 'locked-first'
  | 'not-locked'
  | 'no-item'
  | 'not-allies'
  | 'downed-ally'
  | 'cannot-run'
  | 'cannot-switch'
  | 'no-such-ask'
  | 'not-ready'

export interface FightStep {
  fight: Fight
  /** Why the command changed nothing. */
  refused?: Refusal | (string & {})
  /** The round the command set off, when it was the last lock. */
  played?: PlayedRound
}

export interface FightStart {
  encounter: { id: string; name: string }
  enemies: readonly Enemy[]
  bags: Readonly<Record<string, readonly ItemStack[]>>
  enemyBag: readonly ItemStack[]
  timerSeconds: number | undefined
  /** What happened as the Pokémon entered. */
  opening: RoundResult
}

/** A fight just launched: the engine has let the Pokémon in, and round 1 is to be chosen. */
export function openFight(start: FightStart, context: FightContext): Fight {
  const { engine } = context
  return settled(
    {
      encounter: start.encounter,
      enemies: start.enemies,
      round: engine.round,
      locked: {},
      takenBack: [],
      asks: [],
      timer: newRoundTimer(start.timerSeconds, false),
      bags: start.bags,
      enemyBag: start.enemyBag,
      last: { round: 0, log: named(start.opening.log, engine), events: start.opening.events, before: engine.combatants() },
      outcome: outcomeOf(engine),
    },
    context,
  )
}

export function fightStep(fight: Fight, author: Author, command: FightCommand, context: FightContext): FightStep {
  const step = carriedOut(fight, author, command, context)
  return { ...step, fight: settled(step.fight, context) }
}

/** Whether everyone who has a choice has locked: the round can be played. */
export function isReady(fight: Fight, context: FightContext): boolean {
  return fight.outcome === undefined && choosers(context.engine).every((id) => id in fight.locked)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const refusal = (fight: Fight, refused: NonNullable<FightStep['refused']>): FightStep => ({ fight, refused })
const done = (fight: Fight): FightStep => ({ fight })

/** Tries something the engine may refuse: gives the code of its refusal, or nothing when it went through. */
function engineRefusal(attempt: () => void): string | undefined {
  try {
    attempt()
  } catch (error) {
    if (error instanceof BattleRuleError) return error.code
    throw error
  }
  return undefined
}

function carriedOut(fight: Fight, author: Author, command: FightCommand, context: FightContext): FightStep {
  if (command.do === 'clock') return ranOut(fight, context) ? expired(fight, context) : done(fight)
  if (fight.outcome !== undefined) return refusal(fight, 'over')

  switch (command.do) {
    case 'timer':
    case 'pause':
    case 'resume':
    case 'play':
      if (author !== 'gm') return refusal(fight, 'not-yours')
      if (command.do === 'play') return isReady(fight, context) ? played(fight, context) : refusal(fight, 'not-ready')
      return done({ ...fight, timer: timerSet(fight.timer, command, context.now) })
    default:
  }

  const field = context.engine.combatants()
  const who = field.find((combatant) => combatant.id === command.who)
  if (!who) return refusal(fight, 'unknown-combatant')
  if (!mayCommand(author, who, context)) return refusal(fight, 'not-yours')
  if (who.side === 'players' && fight.timer.expired) return refusal(fight, 'closed')

  switch (command.do) {
    case 'lock':
      return lock(fight, author, who, command.choice, command.extra ?? [], context)
    case 'unlock': {
      if (!(who.id in fight.locked)) return refusal(fight, 'not-locked')
      return done({ ...fight, locked: without(fight.locked, who.id) })
    }
    case 'run':
    case 'switch': {
      if (who.id in fight.locked) return refusal(fight, 'locked-first')
      const other = field.find((combatant) => combatant.id === command.with)
      if (!other || other.side !== who.side) return refusal(fight, 'not-allies')
      if (other.id === who.id) return done(fight)
      return command.do === 'run' ? run(fight, who, other, context) : exchange(fight, who, other, context)
    }
    case 'answer': {
      const ask = fight.asks.find((entry) => entry.kind === command.kind && entry.from === command.from && entry.to === who.id)
      if (!ask) return refusal(fight, 'no-such-ask')
      const rest = { ...fight, asks: fight.asks.filter((entry) => entry !== ask) }
      if (!command.accept) return done(rest)
      return ask.kind === 'run' ? swapped(rest, ask.from, ask.to, context) : exchanged(rest, ask.from, ask.to, context)
    }
    case 'withdraw':
      return done({ ...fight, asks: fight.asks.filter((entry) => !(entry.kind === command.kind && entry.from === who.id)) })
  }
}

/**
 * A player speaks for their own Pokémon. The game master speaks for the
 * enemies, and for the Pokémon of a player who is away (decision 16).
 */
function mayCommand(author: Author, who: CombatantView, context: FightContext): boolean {
  if (who.side === 'enemies') return author === 'gm'
  return author === 'gm' ? context.absent.has(who.id) : author.player === who.id
}

function lock(fight: Fight, author: Author, who: CombatantView, choice: Choice, extra: readonly MoveChoice[], context: FightContext): FightStep {
  // Struggle is never chosen: the game master gives it to the Pokémon of a player who is away.
  if (choice.do === 'struggle' && !(author === 'gm' && who.side === 'players')) return refusal(fight, 'not-yours')
  if (choice.do === 'bag' && !inStock(fight, who, choice.item, context)) return refusal(fight, 'no-item')
  const action = actionOf(choice, context)
  if (!action) return refusal(fight, 'no-item')
  const refused = engineRefusal(() => {
    context.engine.checkAction(who.id, action, extra)
  })
  if (refused) return refusal(fight, refused)
  const entry: Locked = { choice, extra: [...extra], by: author === 'gm' && who.side === 'players' ? 'gm' : 'self' }
  const next = { ...fight, locked: { ...fight.locked, [who.id]: entry }, takenBack: fight.takenBack.filter((id) => id !== who.id) }
  return isReady(next, context) ? played(next, context) : done(next)
}

function run(fight: Fight, who: CombatantView, other: CombatantView, context: FightContext): FightStep {
  if (who.downed || who.dead) return refusal(fight, 'cannot-run')
  if (other.downed) return refusal(fight, 'downed-ally')
  // A dead ally's slot is free, and the game master moves the enemies as one hand: nobody is left to ask.
  if (other.dead || who.side === 'enemies') return swapped(fight, who.id, other.id, context)
  return done(asked(fight, { kind: 'run', from: who.id, to: other.id }))
}

function exchange(fight: Fight, who: CombatantView, other: CombatantView, context: FightContext): FightStep {
  if ([who, other].some((combatant) => combatant.downed || combatant.dead)) return refusal(fight, 'cannot-switch')
  // Decision 138: the game master exchanges Speed between enemies as players do among themselves.
  if (who.side === 'enemies') return exchanged(fight, who.id, other.id, context)
  return done(asked(fight, { kind: 'switch', from: who.id, to: other.id }))
}

/** One ask of each kind per Pokémon: a new one takes the place of the last. */
function asked(fight: Fight, ask: Ask): Fight {
  return { ...fight, asks: [...fight.asks.filter((entry) => !(entry.kind === ask.kind && entry.from === ask.from)), ask] }
}

function swapped(fight: Fight, first: string, second: string, context: FightContext): FightStep {
  const { engine } = context
  const slot = engine.combatants().find((combatant) => combatant.id === second)?.position
  if (slot === undefined) return refusal(fight, 'unknown-combatant')
  const refused = engineRefusal(() => {
    engine.run(first, slot)
  })
  return refused ? refusal(fight, refused) : stillInReach(fight, context)
}

function exchanged(fight: Fight, first: string, second: string, context: FightContext): FightStep {
  const refused = engineRefusal(() => {
    context.engine.exchangeSpeed(first, second)
  })
  // The order of the round changed inside the engine: the fight is a new one to tell and to keep, though nothing of its own moved.
  return refused ? refusal(fight, refused) : done({ ...fight })
}

/**
 * After a swap, a locked action whose target left its reach is taken back
 * (kickoff prompt, "Actions"). Once the timer has run out a player chooses no
 * more: that Pokémon is left with what the timer gives.
 */
function stillInReach(fight: Fight, context: FightContext): FightStep {
  const { engine } = context
  const sides = new Map(engine.combatants().map((combatant) => [combatant.id, combatant.side]))
  const locked: Record<string, Locked> = {}
  const takenBack = new Set(fight.takenBack)
  for (const [id, entry] of Object.entries(fight.locked)) {
    const action = actionOf(entry.choice, context)
    const holds =
      action !== undefined &&
      engineRefusal(() => {
        engine.checkAction(id, action, entry.extra)
      }) === undefined
    if (holds) {
      locked[id] = entry
    } else {
      takenBack.add(id)
      if (fight.timer.expired && sides.get(id) === 'players') locked[id] = TIMED_OUT
    }
  }
  return done({ ...fight, locked, takenBack: [...takenBack] })
}

// ---------------------------------------------------------------------------
// The round
// ---------------------------------------------------------------------------

/** The Pokémon that have a choice this round: standing, and not locked into a move. */
function choosers(engine: FightEngine): string[] {
  return engine
    .combatants()
    .filter((combatant) => {
      const request = engine.request(combatant.id)
      return request.canAct && request.forced === null
    })
    .map((combatant) => combatant.id)
}

function actionOf(choice: Choice, context: FightContext): RoundAction | undefined {
  switch (choice.do) {
    case 'move': {
      const action: RoundAction = { type: 'move', move: choice.move }
      if (choice.target !== undefined) action.target = choice.target
      if (choice.allySwitch) action.allySwitch = choice.allySwitch
      return action
    }
    case 'bag': {
      const effect = context.bagEffect(choice.item)
      if (!effect) return undefined
      const use: BagUse = { item: choice.item, target: choice.target, effect }
      if (choice.move !== undefined) use.move = choice.move
      return { type: 'bag', use }
    }
    case 'wait':
      return { type: 'wait' }
    case 'struggle':
      return { type: 'struggle' }
  }
}

/** Whether the Pokémon's side still has one of that item that no other Pokémon has locked. */
function inStock(fight: Fight, who: CombatantView, item: string, context: FightContext): boolean {
  if (who.side === 'players') return (fight.bags[who.id] ?? []).some((stack) => stack.item === item)
  // The enemies share one Bag: an item one of them has locked is not there for the next.
  const enemies = new Set(context.engine.combatants().filter((combatant) => combatant.side === 'enemies').map((combatant) => combatant.id))
  const held = fight.enemyBag.find((stack) => stack.item === item)?.quantity ?? 0
  const taken = Object.entries(fight.locked).filter(([id, entry]) => id !== who.id && enemies.has(id) && entry.choice.do === 'bag' && entry.choice.item === item).length
  return held - taken >= 1
}

function played(fight: Fight, context: FightContext): FightStep {
  const { engine } = context
  const sides = new Map(engine.combatants().map((combatant) => [combatant.id, combatant.side]))
  const actions: Record<string, RoundAction> = {}
  const extraMoves: Record<string, MoveChoice[]> = {}
  for (const [id, entry] of Object.entries(fight.locked)) {
    const action = actionOf(entry.choice, context)
    if (action) actions[id] = action
    if (entry.extra.length > 0) extraMoves[id] = [...entry.extra]
  }

  const before = engine.combatants()
  const weather = engine.field().weather?.id
  let result: RoundResult
  try {
    result = engine.resolveRound({ actions, extraMoves })
  } catch (error) {
    // The engine plays nothing when it refuses a round: the Pokémon it names chooses again.
    if (!(error instanceof BattleRuleError) || error.combatant === undefined) throw error
    return { fight: { ...fight, locked: without(fight.locked, error.combatant), takenBack: [...new Set([...fight.takenBack, error.combatant])] }, refused: error.code }
  }

  // An item leaves the Bag only when it was used: one that could not be, or whose user was stopped, stays (decision 21).
  let { bags, enemyBag } = fight
  for (const event of result.events) {
    if (event.type !== 'bag' || event.outcome !== 'used') continue
    if (sides.get(event.user) === 'enemies') enemyBag = oneLess(enemyBag, event.item)
    else bags = { ...bags, [event.user]: oneLess(bags[event.user] ?? [], event.item) }
  }

  const last: PlayedRound = { round: fight.round, log: named(result.log, engine), events: result.events, before, ...(weather ? { weather } : {}) }
  const next: Fight = {
    ...fight,
    round: engine.round,
    locked: {},
    takenBack: [],
    asks: [],
    timer: newRoundTimer(fight.timer.seconds, fight.timer.paused),
    bags,
    enemyBag,
    last,
    outcome: outcomeOf(engine),
  }
  return { fight: next, played: last }
}

/** The engine names a Pokémon by its side, slot and a short key ("p1a: P2"): the log that leaves the table names it by its combatant id. */
function named(log: readonly string[], engine: FightEngine): string[] {
  return log.map((line) => line.replace(/p[12][a-f]?: [PE][1-6]/g, (identity) => engine.whoIs(identity) ?? identity))
}

function outcomeOf(engine: FightEngine): Outcome | undefined {
  return engine.ended ? (engine.outcome ?? 'tie') : undefined
}

function oneLess(bag: readonly ItemStack[], item: string): ItemStack[] {
  return bag.flatMap((stack) => (stack.item !== item ? [stack] : stack.quantity > 1 ? [{ ...stack, quantity: stack.quantity - 1 }] : []))
}

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([id]) => id !== key))
}

// ---------------------------------------------------------------------------
// The timer (decisions 14 and 15): it binds players only
// ---------------------------------------------------------------------------

/** What the timer gives a player's Pokémon that has not chosen: Struggle on a random foe in reach. */
const TIMED_OUT: Locked = { choice: { do: 'struggle' }, extra: [], by: 'timer' }

function newRoundTimer(seconds: number | undefined, paused: boolean): Timer {
  return { seconds, paused, deadline: undefined, left: (seconds ?? 0) * 1000, expired: false }
}

function timerSet(timer: Timer, command: Extract<FightCommand, { do: 'timer' | 'pause' | 'resume' }>, now: number): Timer {
  // Stopped where it stands: `settled` starts it again from what is left.
  const stopped: Timer = timer.deadline === undefined ? timer : { ...timer, deadline: undefined, left: Math.max(0, timer.deadline - now) }
  if (command.do === 'pause') return { ...stopped, paused: true }
  if (command.do === 'resume') return { ...stopped, paused: false }
  // A new length counts from now, for the round being chosen too.
  return { ...stopped, seconds: command.seconds, left: (command.seconds ?? 0) * 1000 }
}

function ranOut(fight: Fight, context: FightContext): boolean {
  return fight.outcome === undefined && fight.timer.deadline !== undefined && context.now >= fight.timer.deadline
}

/** Time is up: every player's Pokémon that has not chosen uses Struggle, pending asks lapse, and players choose no more this round. */
function expired(fight: Fight, context: FightContext): FightStep {
  const { engine } = context
  const sides = new Map(engine.combatants().map((combatant) => [combatant.id, combatant.side]))
  const locked: Record<string, Locked> = { ...fight.locked }
  for (const id of choosers(engine)) {
    if (sides.get(id) === 'players' && !(id in locked)) locked[id] = TIMED_OUT
  }
  const next: Fight = {
    ...fight,
    locked,
    asks: fight.asks.filter((ask) => sides.get(ask.from) !== 'players'),
    timer: { ...fight.timer, deadline: undefined, left: 0, expired: true },
  }
  // The round is played as soon as the game master has locked every enemy (decision 14).
  return isReady(next, context) ? played(next, context) : done(next)
}

/**
 * Starts or stops the countdown to match where the fight stands. It runs
 * while a timer is set, the game master has not stopped it, it has not run
 * out, and no player who still has to choose is away: a disconnection holds
 * it until they are back or the game master has chosen for them.
 */
function settled(fight: Fight, context: FightContext): Fight {
  const { timer } = fight
  const runs = timer.seconds !== undefined && !timer.paused && !timer.expired && fight.outcome === undefined && !awaitsAbsent(fight, context)
  if (runs && timer.deadline === undefined) return { ...fight, timer: { ...timer, deadline: context.now + timer.left } }
  if (!runs && timer.deadline !== undefined) return { ...fight, timer: { ...timer, deadline: undefined, left: Math.max(0, timer.deadline - context.now) } }
  return fight
}

function awaitsAbsent(fight: Fight, context: FightContext): boolean {
  if (context.absent.size === 0) return false
  return choosers(context.engine).some((id) => context.absent.has(id) && !(id in fight.locked))
}

// ---------------------------------------------------------------------------
// What each side is shown
// ---------------------------------------------------------------------------

/** An enemy's sheet as players see it: everything but its class, which is the game master's own label (decision 133). */
export type EnemySheet = Omit<Enemy, 'class'>

export interface FightView {
  encounter: { id: string; name: string }
  round: number
  outcome: Outcome | undefined
  /** Everyone on both lines. Players see everything of the enemies (decision 17). */
  combatants: CombatantView[]
  /** The weather, the terrain and everything else in effect. */
  field: FieldView
  enemies: EnemySheet[]
  /** What each Pokémon may lock, by its id. */
  requests: Record<string, ActionRequest>
  locked: Record<string, Locked>
  /** The Pokémon whose locked action was taken back and who have to choose again. */
  takenBack: string[]
  asks: Ask[]
  /** The Pokémon in the order they would act if the round were played now (decision 135). */
  order: string[]
  bags: Record<string, ItemStack[]>
  timer: {
    seconds: number | undefined
    /** Counting down right now. */
    running: boolean
    /** Milliseconds left at the moment this was drawn up. */
    left: number
    expired: boolean
  }
  last: PlayedRound
}

/** What only the game master is shown, on top of everything else. */
export interface TableView extends FightView {
  /** Each enemy's class, by its id. */
  classes: Record<string, MobClass>
  enemyBag: ItemStack[]
  /** Everyone who has a choice has locked. */
  ready: boolean
  /** The game master stopped the timer. */
  paused: boolean
}

/** The whole table, for the game master. */
export function tableView(fight: Fight, context: FightContext): TableView {
  const { engine } = context
  const combatants = engine.combatants()
  const actions: Record<string, RoundAction | undefined> = {}
  for (const [id, entry] of Object.entries(fight.locked)) actions[id] = actionOf(entry.choice, context)
  const { timer } = fight
  return {
    encounter: fight.encounter,
    round: fight.round,
    outcome: fight.outcome,
    combatants,
    field: engine.field(),
    enemies: fight.enemies.map(sheetOf),
    requests: Object.fromEntries(combatants.map((combatant) => [combatant.id, engine.request(combatant.id)])),
    locked: { ...fight.locked },
    takenBack: [...fight.takenBack],
    asks: [...fight.asks],
    order: engine.turnOrder(actions),
    bags: Object.fromEntries(Object.entries(fight.bags).map(([id, bag]) => [id, [...bag]])),
    timer: {
      seconds: timer.seconds,
      running: timer.deadline !== undefined,
      left: timer.deadline === undefined ? timer.left : Math.max(0, timer.deadline - context.now),
      expired: timer.expired,
    },
    last: fight.last,
    classes: Object.fromEntries(fight.enemies.map((enemy) => [enemy.id, enemy.class])),
    enemyBag: [...fight.enemyBag],
    ready: isReady(fight, context),
    paused: timer.paused,
  }
}

function sheetOf(enemy: Enemy): EnemySheet {
  const sheet: Partial<Enemy> = { ...enemy }
  delete sheet.class
  return sheet as EnemySheet
}

/**
 * What the players are shown: both lines in full, and of the choices only
 * their own party's. What the enemies have locked, their order and their Bag
 * stay with the game master (decisions 18 and 146).
 */
export function partyView(fight: Fight, context: FightContext): FightView {
  const table = tableView(fight, context)
  const party = new Set(table.combatants.filter((combatant) => combatant.side === 'players').map((combatant) => combatant.id))
  const ofParty = <T>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([id]) => party.has(id)))
  return {
    encounter: table.encounter,
    round: table.round,
    outcome: table.outcome,
    combatants: table.combatants,
    field: table.field,
    enemies: table.enemies,
    requests: ofParty(table.requests),
    locked: ofParty(table.locked),
    takenBack: table.takenBack.filter((id) => party.has(id)),
    asks: table.asks.filter((ask) => party.has(ask.from)),
    order: table.order.filter((id) => party.has(id)),
    bags: table.bags,
    timer: table.timer,
    last: table.last,
  }
}
