/**
 * A live session as the game master's browser runs it: who asks to come in,
 * who is in, and what each player must be told. Pure: the screen shows the
 * session and sends events; the connection carries what `send` lists.
 *
 * The game master's browser is the authority. A character is checked against
 * the campaign's own rules before the game master even sees the request, and
 * the copy a member is given back is the one that counts from then on.
 */
import type { DataPack } from '../../data/types.ts'
import { openCharacter } from '../../domain/open-character.ts'
import { PARTY_MAX } from '../../game-rules/party.ts'
import { type HostMessage, type Party, type Refusal, decodeGuestMessage } from '../../shared/protocol/session.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import type { Standing } from '../import/standing.ts'

/** A player asking to come in, waiting for the game master's answer. */
export interface JoinRequest {
  /** How the relay names the player's device. */
  peer: string
  /** The character as the player's device has it. */
  character: CharacterDocument
  /** The game master's own copy from an earlier session, when there is one and the two are not alike (decision 13). */
  kept?: CharacterDocument
  /** How the player's copy stands against the game master's. */
  standing: Exclude<Standing, 'unreadable'>
}

export interface Member {
  peer: string
  /** The copy that counts. */
  character: CharacterDocument
  /** Whether the player's device is connected right now. */
  present: boolean
}

export interface HostSession {
  /** The campaign being played, with the game master's copies of the characters that joined it. */
  campaign: CampaignDocument
  /** One more each time the party changes. */
  revision: number
  requests: readonly JoinRequest[]
  party: readonly Member[]
}

export type HostEvent =
  /** The relay says a player's device came or went. */
  | { on: 'peer'; peer: string; present: boolean }
  /** A player's device sent something; what it holds is not trusted yet. */
  | { on: 'message'; from: string; body: unknown }
  /** The game master lets a player in, keeping the player's copy of the character or their own. */
  | { on: 'approve'; peer: string; keep: 'theirs' | 'mine' }
  | { on: 'decline'; peer: string }
  /** The game master takes a member out of the session (decision 123). */
  | { on: 'remove'; peer: string }

export interface HostStep {
  session: HostSession
  /** What to send, and to which players. */
  send: { to: string[]; message: HostMessage }[]
}

/** A session that starts with nobody in it. */
export function openSession(campaign: CampaignDocument): HostSession {
  return { campaign, revision: 0, requests: [], party: [] }
}

/** A character as it travels and as the campaign keeps it: without the rules a player's device kept with it. */
function bare(character: CharacterDocument): CharacterDocument {
  const copy = { ...character }
  delete copy.rules
  return copy
}

/** The party as one member is told it. */
function partyFor(session: HostSession, member: Member): Party {
  return {
    revision: session.revision,
    campaign: { id: session.campaign.id, name: session.campaign.name },
    you: member.character.id,
    members: session.party.map(({ character, present }) => ({ character, present })),
  }
}

/** The party, told to every member whose device is there. */
function tellParty(session: HostSession): HostStep['send'] {
  return session.party.filter((member) => member.present).map((member) => ({ to: [member.peer], message: { t: 'party', party: partyFor(session, member) } }))
}

const refuse = (session: HostSession, peer: string, reason: Refusal): HostStep => ({ session, send: [{ to: [peer], message: { t: 'refused', reason } }] })

/** The session after a change of who is in it: one revision further, and everyone told. */
function changed(session: HostSession, extra: HostStep['send'] = []): HostStep {
  const next = { ...session, revision: session.revision + 1 }
  return { session: next, send: [...extra, ...tellParty(next)] }
}

export function hostStep(session: HostSession, event: HostEvent, pack: DataPack): HostStep {
  switch (event.on) {
    case 'peer': {
      if (event.present) return { session, send: [] }
      // A device that left takes its request with it: it asks again when it is back.
      const requests = session.requests.filter((request) => request.peer !== event.peer)
      const member = session.party.find((entry) => entry.peer === event.peer)
      if (!member?.present) return { session: { ...session, requests }, send: [] }
      return changed({ ...session, requests, party: session.party.map((entry) => (entry === member ? { ...entry, present: false } : entry)) })
    }
    case 'message':
      return heard(session, event.from, event.body, pack)
    case 'approve': {
      const request = session.requests.find((entry) => entry.peer === event.peer)
      if (!request || session.party.length >= PARTY_MAX) return { session, send: [] }
      const character = event.keep === 'mine' && request.kept ? request.kept : request.character
      // The copy let in becomes the game master's own, in the campaign.
      const campaign: CampaignDocument = {
        ...session.campaign,
        revision: session.campaign.revision + 1,
        characters: [...session.campaign.characters.filter((kept) => kept.id !== character.id), character],
      }
      return changed({
        ...session,
        campaign,
        requests: session.requests.filter((entry) => entry !== request),
        party: [...session.party, { peer: request.peer, character, present: true }],
      })
    }
    case 'decline': {
      if (!session.requests.some((request) => request.peer === event.peer)) return { session, send: [] }
      return refuse({ ...session, requests: session.requests.filter((request) => request.peer !== event.peer) }, event.peer, 'declined')
    }
    case 'remove': {
      if (!session.party.some((member) => member.peer === event.peer)) return { session, send: [] }
      return changed({ ...session, party: session.party.filter((member) => member.peer !== event.peer) }, [{ to: [event.peer], message: { t: 'removed' } }])
    }
  }
}

function heard(session: HostSession, peer: string, body: unknown, pack: DataPack): HostStep {
  const decoded = decodeGuestMessage(body)
  // What cannot be read is not answered, except to say that the two apps are of different versions.
  if (!decoded.ok) return decoded.reason === 'version' ? refuse(session, peer, 'version') : { session, send: [] }
  const message = decoded.message

  if (message.t === 'hello') return { session, send: [{ to: [peer], message: { t: 'about', campaign: { id: session.campaign.id, name: session.campaign.name } } }] }

  if (message.t === 'leave') {
    const requests = session.requests.filter((request) => request.peer !== peer)
    if (!session.party.some((member) => member.peer === peer)) return { session: { ...session, requests }, send: [] }
    return changed({ ...session, requests, party: session.party.filter((member) => member.peer !== peer) })
  }

  if (message.dataPackVersion !== pack.version) return refuse(session, peer, 'other-data')
  const character = bare(message.character)
  if (character.campaign.id !== session.campaign.id) return refuse(session, peer, 'other-campaign')
  const rules = session.campaign.rulesHistory.find((version) => version.version === character.campaign.rulesVersion)
  if (!rules || !openCharacter(character, rules, pack).ok) return refuse(session, peer, 'invalid')

  const seat = session.party.find((member) => member.peer === peer)
  if (seat) {
    // One character per device (decision 119): the device is in already, and comes back with that character or not at all.
    if (seat.character.id !== character.id) return refuse(session, peer, 'already-in')
    // Back after a dropped connection. The copy that counts is the session's, whatever the device still has.
    if (seat.present) return { session, send: [{ to: [peer], message: { t: 'party', party: partyFor(session, seat) } }] }
    return changed({ ...session, party: session.party.map((member) => (member === seat ? { ...member, present: true } : member)) })
  }
  if (session.party.some((member) => member.character.id === character.id)) return refuse(session, peer, 'already-in')
  if (session.party.length >= PARTY_MAX) return refuse(session, peer, 'full')

  const kept = session.campaign.characters.find((copy) => copy.id === character.id)
  const standing: JoinRequest['standing'] = !kept ? 'new' : sameValue(kept, character) ? 'same' : character.revision > kept.revision ? 'newer' : character.revision < kept.revision ? 'older' : 'differs'
  const request: JoinRequest = { peer, character, standing, ...(kept && standing !== 'same' ? { kept } : {}) }
  return {
    session: { ...session, requests: [...session.requests.filter((entry) => entry.peer !== peer), request] },
    send: [{ to: [peer], message: { t: 'waiting' } }],
  }
}
