/**
 * A fight as it travels inside a live session (milestone 6): what the game
 * master's browser tells the players of the fight being played, and what a
 * player asks for their own Pokémon.
 *
 * The game master's browser alone runs the fight. A player's device sends an
 * intent and is answered; the state it then shows is the one it was sent,
 * never one it worked out.
 */
import { z } from 'zod'
import { LINE_MAX } from '../../game-rules/party.ts'
import { dataId, documentId, itemStack, whole } from '../schema/common.ts'
import { enemy } from '../schema/encounter.ts'

/** A Pokémon on the field goes by the id of its character or of its enemy. */
const combatantId = documentId
/** A word of the battle engine: a status, an effect, a way of targeting. */
const engineWord = z.string().max(40)

const moveChoice = z.object({
  move: dataId,
  target: combatantId.optional(),
  /** For the move Ally Switch: the two party members who trade places. */
  allySwitch: z.tuple([combatantId, combatantId]).optional(),
})

/** What a player may give their Pokémon to do. */
export const playerChoice = z.discriminatedUnion('do', [
  moveChoice.extend({ do: z.literal('move') }),
  /**
   * An item on any Pokémon on the field; `move` names the move a PP item restores. The item comes from the
   * character's own Bag, or from the Bag of the downed or dead teammate that `from` names (decision 175).
   */
  z.object({ do: z.literal('bag'), item: dataId, target: combatantId, move: dataId.optional(), from: combatantId.optional() }),
  z.object({ do: z.literal('wait') }),
])

/** What a Pokémon was given to do: a player's choice, or the Struggle that the timer and an absent player get. */
const choice = z.discriminatedUnion('do', [...playerChoice.options, z.object({ do: z.literal('struggle') })])

const askKind = z.enum(['run', 'switch'])

/** What a player asks for their own Pokémon during a round's choices. */
export const intent = z.discriminatedUnion('do', [
  z.object({ do: z.literal('lock'), choice: playerChoice }),
  z.object({ do: z.literal('unlock') }),
  /** Run: trade places with an ally. */
  z.object({ do: z.literal('run'), with: combatantId }),
  /** Switch: exchange Speed with an ally for the round. */
  z.object({ do: z.literal('switch'), with: combatantId }),
  /** The answer to an ally's ask. */
  z.object({ do: z.literal('answer'), kind: askKind, from: combatantId, accept: z.boolean() }),
  /** Takes one's own ask back. */
  z.object({ do: z.literal('withdraw'), kind: askKind }),
])

export type Intent = z.infer<typeof intent>

const moveView = z.object({ id: dataId, pp: whole(0, 99), maxPp: whole(0, 99) })

const combatant = z.object({
  id: combatantId,
  side: z.enum(['players', 'enemies']),
  position: whole(0, LINE_MAX - 1),
  species: dataId,
  hp: whole(0, 999),
  maxHp: whole(1, 999),
  status: engineWord,
  downed: z.boolean(),
  dead: z.boolean(),
  stacks: whole(0, 3),
  item: engineWord,
  itemSpent: z.boolean(),
  ability: engineWord,
  boosts: z.record(engineWord, z.number().int().min(-6).max(6)),
  volatiles: z.array(engineWord).max(100),
  moves: z.array(moveView).max(6),
})

/** Something in effect: its id in the engine, the turns it still lasts, its layers. */
const effect = z.object({ id: engineWord, turns: whole(1, 999).optional(), layers: whole(1, 9).optional() })

const field = z.object({
  weather: effect.optional(),
  terrain: effect.optional(),
  rooms: z.array(effect).max(20),
  sides: z.object({ players: z.array(effect).max(30), enemies: z.array(effect).max(30) }),
  /** What sits on one Pokémon, by its id. */
  pokemon: z.record(combatantId, z.array(effect).max(60)),
})

const actionRequest = z.object({
  canAct: z.boolean(),
  /** The move the Pokémon is locked into, when it has no choice. */
  forced: engineWord.nullable(),
  moves: z
    .array(moveView.extend({ disabled: z.boolean(), target: engineWord, needsTarget: z.boolean(), targets: z.array(combatantId).max(2 * LINE_MAX) }))
    .max(6),
})

/** What Denborn's own rules did during a round (battle/contract.ts, DenbornEvent). */
const denbornEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('downed'), id: combatantId, stacks: whole(0, 3) }),
  z.object({ type: z.literal('fainted'), id: combatantId }),
  z.object({ type: z.literal('agonizing'), id: combatantId, stacks: whole(0, 3) }),
  z.object({ type: z.literal('agonyhit'), id: combatantId, stacks: whole(0, 3), capped: z.boolean() }),
  z.object({ type: z.literal('died'), id: combatantId }),
  z.object({ type: z.literal('revived'), id: combatantId, hp: whole(1, 999) }),
  z.object({ type: z.literal('bag'), user: combatantId, item: dataId, target: combatantId, outcome: z.enum(['used', 'failed', 'blocked']) }),
  z.object({ type: z.literal('pp'), id: combatantId, move: dataId, pp: whole(0, 99) }),
  z.object({ type: z.literal('wait'), id: combatantId }),
])

/** A round as it was played: the engine's lines, in order, and Denborn's own events among them. */
const playedRound = z.object({
  /** 0 for the Pokémon entering. */
  round: whole(0, 100_000),
  log: z.array(z.string().max(600)).max(3000),
  events: z.array(denbornEvent).max(600),
  /** Everyone as they stood when the round began. */
  before: z.array(combatant).max(2 * LINE_MAX),
  /** The weather the round began under. */
  weather: engineWord.optional(),
})

/** The fight as every player of the party is shown it (features/battle/fight.ts, FightView). */
export const playerFight = z.object({
  encounter: z.object({ id: documentId, name: z.string().min(1).max(60) }),
  round: whole(1, 100_000),
  /** Set once the fight is over. */
  outcome: z.enum(['players', 'enemies', 'tie']).optional(),
  /** Everyone on both lines: players see everything of the enemies (decision 17). */
  combatants: z.array(combatant).max(2 * LINE_MAX),
  /** The weather, the terrain and everything else in effect (decisions 89 and 92). */
  field,
  /** The enemies' sheets, without the class the game master gave each (decision 133). */
  enemies: z.array(enemy.omit({ class: true })).max(LINE_MAX),
  /** What each Pokémon of the party may lock. */
  requests: z.record(combatantId, actionRequest),
  /** What each Pokémon of the party has locked (decision 146). */
  locked: z.record(combatantId, z.object({ choice, extra: z.array(moveChoice).max(0), by: z.enum(['self', 'gm', 'timer']) })),
  /** The Pokémon whose locked action was taken back: a swap put their target out of reach. */
  takenBack: z.array(combatantId).max(LINE_MAX),
  /** The swaps waiting for a teammate's answer. */
  asks: z.array(z.object({ kind: askKind, from: combatantId, to: combatantId })).max(2 * LINE_MAX),
  /** The party in the order it would act (decision 135). */
  order: z.array(combatantId).max(LINE_MAX),
  /** What is left in each character's bag. */
  bags: z.record(combatantId, z.array(itemStack).max(500)),
  timer: z.object({
    /** Nothing when the game master runs no timer. */
    seconds: whole(1, 86_400).optional(),
    running: z.boolean(),
    /** Milliseconds left when this was sent. */
    left: whole(0, 86_400_000),
    expired: z.boolean(),
  }),
  last: playedRound,
})

export type PlayerFight = z.infer<typeof playerFight>

/** Why an intent changed nothing: a word of the table or of the engine, for the screen to put into words. */
export const intentRefusal = z.string().min(1).max(40)
