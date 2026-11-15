/**
 * A live session as a player's browser sees it: reaching the room, asking to
 * come in, waiting, being in, and every way of being out. Pure: the screen
 * shows the state and sends events; the connection carries what `send` lists.
 *
 * The player's device decides nothing. It asks with its character each time
 * it reaches the game master, first time or back from a dropped connection,
 * and keeps the copy of its character the game master's side gives back.
 */
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
  /** Asked; no answer yet. */
  | { at: 'asking' }
  /** The request is in front of the game master. */
  | { at: 'waiting' }
  /** In the session. `linked` is false while this device's own connection is down; `hostThere` while the game master's is. */
  | { at: 'in'; party: Party; linked: boolean; hostThere: boolean }
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
  /** The player leaves. */
  | { on: 'leave' }

export interface GuestStep {
  state: GuestState
  send: GuestMessage[]
  /** The copy of the player's character that now counts, when it is not the one the device has: to be kept in its place. */
  keep?: CharacterDocument
}

/** What the device brings: its character, and the version of the game data its app carries. */
export interface Mine {
  character: CharacterDocument
  dataPackVersion: string
}

export const GUEST_START: GuestState = { at: 'reaching' }

/** The character as it travels: without the rules the device keeps with it, which the game master has. */
function bare(character: CharacterDocument): CharacterDocument {
  const copy = { ...character }
  delete copy.rules
  return copy
}

const ask = (mine: Mine): GuestMessage => ({ t: 'ask', dataPackVersion: mine.dataPackVersion, character: bare(mine.character) })

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
      // The game master is there: ask, the first time and every time either side comes back.
      return { state: state.at === 'in' ? { ...state, linked: true, hostThere: true } : { at: 'asking' }, send: [ask(mine)] }
    }
    case 'message': {
      const decoded = decodeHostMessage(event.body)
      if (!decoded.ok) return decoded.reason === 'version' ? out({ why: 'update' }) : stay(state)
      const message = decoded.message
      if (message.t === 'waiting') return stay(state.at === 'in' ? state : { at: 'waiting' })
      if (message.t === 'refused') return out({ why: 'refused', reason: message.reason })
      if (message.t === 'removed') return out({ why: 'removed' })
      // An older state of the party that arrives late changes nothing.
      if (state.at === 'in' && message.party.revision < state.party.revision) return stay(state)
      const counted = message.party.members.find((member) => member.character.id === message.party.you)?.character
      const next: GuestState = { at: 'in', party: message.party, linked: true, hostThere: true }
      return { state: next, send: [], ...(counted && !sameValue(counted, bare(mine.character)) ? { keep: counted } : {}) }
    }
    case 'closed': {
      const reason = outFor(event.code)
      if (reason) return out(reason)
      // A dropped connection: the device reaches for the room again, and a member stays a member meanwhile.
      return stay(state.at === 'in' ? { ...state, linked: false } : { at: 'reaching' })
    }
    case 'leave':
      return { state: { at: 'out', why: 'left' }, send: state.at === 'reaching' || state.at === 'hostAway' ? [] : [{ t: 'leave' }] }
  }
}
