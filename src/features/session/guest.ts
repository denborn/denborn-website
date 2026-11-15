/**
 * A live session as a player's browser sees it: reaching the room, asking to
 * come in, waiting, being in, and every way of being out. Pure: the screen
 * shows the state and sends events; the connection carries what `send` lists.
 *
 * The player's device decides nothing. It first asks which campaign is played,
 * so that the player chooses among their characters made for it. Then it asks
 * with that character each time it reaches the game master, first time or
 * back from a dropped connection, and keeps the copy of its character the
 * game master's side gives back.
 */
import type { Invitation } from '../../shared/codec/codes.ts'
import type { Intent, PlayerFight } from '../../shared/protocol/battle.ts'
import { CLOSED } from '../../shared/protocol/relay.ts'
import { type GuestMessage, type Party, type Refusal, decodeHostMessage } from '../../shared/protocol/session.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'

/** Why a player is out of a session for good, until they ask again. */
export type Out =
  /** Not let in. */
  | { why: 'refused'; reason: Refusal }
  /** Taken out by the game master (decision 123). */
  | { why: 'removed' }
  /** The player left. */
  | { why: 'left' }
  /** The game master ended the session, or its day ran out. */
  | { why: 'ended' }
  /** No session has this code. */
  | { why: 'noSession' }
  /** The same player connected from elsewhere: this connection gave way. */
  | { why: 'elsewhere' }
  /** The relay, or the game master's app, is of another version than this app. */
  | { why: 'update' }

export type GuestState =
  /** Not connected to the room: at the start, and after a dropped connection. */
  | { at: 'reaching' }
  /** In the room; the game master is not there to ask. */
  | { at: 'hostAway' }
  /** Asked which campaign is played; no answer yet. */
  | { at: 'meeting' }
  /** The campaign is known: the player chooses a character made for it, or makes one under the rules given (decision 128). */
  | { at: 'choosing'; invitation: Invitation }
  /** Asked; no answer yet. */
  | { at: 'asking' }
  /** The request is in front of the game master. */
  | { at: 'waiting' }
  /** In the session. `linked` is false while this device's own connection is down; `hostThere` while the game master's is. */
  | {
      at: 'in'
      party: Party
      linked: boolean
      hostThere: boolean
      /** The newest state of the party heard since this device last reached the game master; nothing before the first. */
      heard?: number
      /** The fight being played, as the game master's side last told it. */
      fight?: PlayerFight
      /** What became of the last intent that was answered: carried out, or why not. */
      answer?: { id: string; refused?: string }
    }
  | ({ at: 'out' } & Out)

export type GuestEvent =
  /** The relay let this device into the room. */
  | { on: 'joined'; host: boolean }
  /** The relay says the game master came or went. */
  | { on: 'host'; present: boolean }
  /** The game master's browser sent something. */
  | { on: 'message'; body: unknown }
  /** The connection closed, with the code it closed with. */
  | { on: 'closed'; code: number }
  /** The player chose the character to bring: it is now what the device brings. */
  | { on: 'chosen' }
  /** The player leaves. */
  | { on: 'leave' }
  /** The player asks something for their Pokémon in the fight. `id` tells this intent from every other. */
  | { on: 'intend'; id: string; intent: Intent }

export interface GuestStep {
  state: GuestState
  send: GuestMessage[]
  /** The copy of the player's character that now counts, when it is not the one the device has: to be kept in its place. */
  keep?: CharacterDocument
}

/** What the device brings: its character, once the player chose one, and the version of the game data its app carries. */
export interface Mine {
  character: CharacterDocument | undefined
  dataPackVersion: string
}

export const GUEST_START: GuestState = { at: 'reaching' }

/** The character as it travels: without the rules the device keeps with it, which the game master has. */
function bare(character: CharacterDocument): CharacterDocument {
  const copy = { ...character }
  delete copy.rules
  return copy
}

/** What the device says when it reaches the game master: its request once a character is chosen, a greeting before. */
function reaching(state: GuestState, mine: Mine): GuestStep {
  if (!mine.character) return { state: { at: 'meeting' }, send: [{ t: 'hello' }] }
  const ask: GuestMessage = { t: 'ask', dataPackVersion: mine.dataPackVersion, character: bare(mine.character) }
  if (state.at !== 'in') return { state: { at: 'asking' }, send: [ask] }
  // A member stays a member, and keeps on screen what it last knew. What the game master says from now on is news,
  // whatever its number: they may have started the session over, and count from the beginning again.
  const { party, fight } = state
  return { state: { at: 'in', party, linked: true, hostThere: true, ...(fight ? { fight } : {}) }, send: [ask] }
}

const stay = (state: GuestState): GuestStep => ({ state, send: [] })
const out = (reason: Out): GuestStep => ({ state: { at: 'out', ...reason }, send: [] })

/** What a close code means for a player; nothing for a connection that merely dropped. */
function outFor(code: number): Out | undefined {
  if (code === CLOSED.ended) return { why: 'ended' }
  if (code === CLOSED.noRoom) return { why: 'noSession' }
  if (code === CLOSED.replaced) return { why: 'elsewhere' }
  if (code === CLOSED.version) return { why: 'update' }
  return undefined
}

export function guestStep(state: GuestState, event: GuestEvent, mine: Mine): GuestStep {
  // Out is out: only a new visit asks again.
  if (state.at === 'out') return stay(state)

  switch (event.on) {
    case 'joined':
    case 'host': {
      const hostThere = event.on === 'joined' ? event.host : event.present
      if (!hostThere) return stay(state.at === 'in' ? { ...state, linked: true, hostThere: false } : { at: 'hostAway' })
      // The game master is there: speak, the first time and every time either side comes back.
      return reaching(state, mine)
    }
    case 'chosen':
      // Asked at once when the game master is there to hear; otherwise as soon as they are.
      return state.at === 'choosing' ? reaching(state, mine) : stay(state)
    case 'message': {
      const decoded = decodeHostMessage(event.body)
      if (!decoded.ok) return decoded.reason === 'version' ? out({ why: 'update' }) : stay(state)
      const message = decoded.message
      if (message.t === 'about') {
        // Only a device that has not chosen yet needs to know the campaign.
        if (mine.character) return stay(state)
        // Other game data on the two sides: no character made or brought here could be let in. Said now, not after a choice.
        if (message.invitation.dataPackVersion !== mine.dataPackVersion) return out({ why: 'refused', reason: 'other-data' })
        return stay({ at: 'choosing', invitation: message.invitation })
      }
      if (message.t === 'waiting') return stay(state.at === 'in' ? state : { at: 'waiting' })
      if (message.t === 'refused') return out({ why: 'refused', reason: message.reason })
      if (message.t === 'removed') return out({ why: 'removed' })
      if (message.t === 'fight') {
        // The fight is a member's to see.
        if (state.at !== 'in') return stay(state)
        const next = { ...state }
        if (message.fight) next.fight = message.fight
        else delete next.fight
        return stay(next)
      }
      if (message.t === 'intentAnswer') {
        if (state.at !== 'in') return stay(state)
        return stay({ ...state, answer: { id: message.id, ...(message.refused ? { refused: message.refused } : {}) } })
      }
      // An older state of the party that arrives late changes nothing.
      if (state.at === 'in' && state.heard !== undefined && message.party.revision < state.heard) return stay(state)
      const counted = message.party.members.find((member) => member.character.id === message.party.you)?.character
      // The fight goes with the party: told without one, there is none.
      const next: GuestState = {
        at: 'in',
        party: message.party,
        linked: true,
        hostThere: true,
        heard: message.party.revision,
        ...(message.fight ? { fight: message.fight } : {}),
        ...(state.at === 'in' && state.answer ? { answer: state.answer } : {}),
      }
      const brought = mine.character ? bare(mine.character) : undefined
      return { state: next, send: [], ...(counted && !sameValue(counted, brought) ? { keep: counted } : {}) }
    }
    case 'closed': {
      const reason = outFor(event.code)
      if (reason) return out(reason)
      // A dropped connection: the device reaches for the room again, and a member stays a member meanwhile.
      return stay(state.at === 'in' ? { ...state, linked: false } : { at: 'reaching' })
    }
    case 'leave':
      return { state: { at: 'out', why: 'left' }, send: state.at === 'reaching' || state.at === 'hostAway' ? [] : [{ t: 'leave' }] }
    case 'intend':
      // Asked only of a fight this device was told, by a game master who is there to hear; the round names which choices it is for.
      if (state.at !== 'in' || !state.fight || !state.linked || !state.hostThere) return stay(state)
      return { state, send: [{ t: 'intent', id: event.id, round: state.fight.round, intent: event.intent }] }
  }
}
