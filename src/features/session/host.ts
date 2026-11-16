/**
 * A live session as the game master's browser runs it: who asks to come in,
 * who is in, and what each player must be told. Pure: the screen shows the
 * session and sends events; the connection carries what `send` lists.
 *
 * The game master's browser is the authority. A character is checked against
 * the campaign's own rules before the game master even sees the request, and
 * the copy a member is given back is the one that counts from then on.
 */
import type { BattleSetup } from '../../battle/contract.ts'
import type { DataPack } from '../../data/types.ts'
import { afterFight, awarded } from '../../domain/after-fight.ts'
import { evolved } from '../../domain/evolution.ts'
import { type Grant, granted } from '../../domain/grants.ts'
import { withHeldItem, withItemUsed, withItemsTaken } from '../../domain/items.ts'
import { withPointsPlaced } from '../../domain/level-up.ts'
import { openCharacter } from '../../domain/open-character.ts'
import { reselected, rested } from '../../domain/rest.ts'
import { type RewardDefaults, rewardDefaults } from '../../domain/rewards.ts'
import { PARTY_MAX } from '../../game-rules/party.ts'
import type { Intent } from '../../shared/protocol/battle.ts'
import { type Granted, type HostMessage, type Party, type Refusal, type SheetChange, decodeGuestMessage } from '../../shared/protocol/session.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import { type LaunchProblem, fightSetup } from '../battle/fight-setup.ts'
import { type Fight, type FightCommand, type FightContext, type FightEngine, type FightStart, type TableView, fightStep, openFight, partyView, tableView } from '../battle/fight.ts'
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
  /** The fight being played, once an encounter was launched (decision 143). */
  fight?: Fight | undefined
  /** The last intents carried out for each player's device: one that arrives twice is not carried out twice. */
  intents?: Readonly<Record<string, readonly string[]>>
  /** The characters resting at a Pokémon Center: each may have its Ability and its moves chosen again, once. */
  resting?: readonly string[]
  /** The last changes made to a sheet for each player's device, like the intents. */
  changes?: Readonly<Record<string, readonly string[]>>
}

/** What a fight in progress needs beside the session: the engine that plays it, and the game master's clock. */
export interface FightTable {
  engine: FightEngine
  /** In milliseconds. */
  now: number
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
  /** The game master's own line to the relay dropped: nobody can be reached until it is back. */
  | { on: 'offline' }
  /** The campaign as the device now keeps it: its rules or its encounters were changed on another screen while the session went on. */
  | { on: 'campaign'; campaign: CampaignDocument }
  /** The game master launched an encounter, and the engine has let the Pokémon in. */
  | { on: 'launched'; start: FightStart }
  /** The game master's own command in the fight. */
  | { on: 'fight'; command: FightCommand }
  /** Time passed: the fight's timer is looked at. */
  | { on: 'clock' }
  /** A fight kept from before the game master's app closed is taken up again, with the engine restored to where it was. */
  | { on: 'resumed'; fight: Fight }
  /**
   * The game master ends the encounter and awards what each character gets,
   * by character (decisions 4 and 136). A character named with nothing gets
   * nothing; the fight's outcome is written to everyone who fought.
   */
  | { on: 'closeFight'; awards: Readonly<Record<string, { exp: number; money: number }>> }
  /** The game master starts a rest at a Pokémon Center for one character of the party (decision 11). */
  | { on: 'rest'; character: string }
  /** The game master gives one character of the party items, Pokédollars or EXP, or takes items or Pokédollars from it (decisions 5 and 170). */
  | { on: 'grant'; character: string; grant: Grant }

export interface HostStep {
  session: HostSession
  /** What to send, and to which players. */
  send: { to: string[]; message: HostMessage }[]
  /** Why the game master's own command changed nothing: in the fight, a rest or a grant. */
  refused?: string
}

/** How many of a device's last intents are remembered, to tell one that arrives twice. */
const INTENTS_REMEMBERED = 30

/**
 * A session as it starts or is taken up again: with the members the game
 * master's device remembers, each with the campaign's copy of its character
 * and counted away until its device speaks (decision 122).
 */
export function openSession(campaign: CampaignDocument, remembered: readonly { peer: string; character: string }[] = []): HostSession {
  const party = remembered.flatMap(({ peer, character: id }): Member[] => {
    const character = campaign.characters.find((copy) => copy.id === id)
    return character ? [{ peer, character, present: false }] : []
  })
  return { campaign, revision: 0, requests: [], party: party.slice(0, PARTY_MAX) }
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
    members: session.party.map(({ character, present }) => ({ character, present, resting: session.resting?.includes(character.id) ?? false })),
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

/**
 * The session after an event. `table` is handed in while a fight is on: the
 * session is plain data, and the engine that plays the fight is not.
 */
export function hostStep(session: HostSession, event: HostEvent, pack: DataPack, table?: FightTable): HostStep {
  return withFightTold(session, stepped(session, event, pack, table), pack, table)
}

function contextOf(session: HostSession, pack: DataPack, table: FightTable): FightContext {
  const there = new Set(session.party.filter((member) => member.present).map((member) => member.character.id))
  // Away: any Pokémon of the players' line whose player is not there, whether their device dropped or they left the session.
  const absent = new Set(
    table.engine
      .combatants()
      .filter((combatant) => combatant.side === 'players' && !there.has(combatant.id))
      .map((combatant) => combatant.id),
  )
  return { engine: table.engine, bagEffect: (item) => pack.items[item]?.bag, isReusable: (item) => pack.items[item]?.reusable === true, absent, now: table.now }
}

/** The fight as the game master is shown it, when one is on. */
export function tableOf(session: HostSession, pack: DataPack, table: FightTable | undefined): TableView | undefined {
  return session.fight && table ? tableView(session.fight, contextOf(session, pack, table)) : undefined
}

/**
 * Tells the players the fight. It goes with the party whenever the party is
 * told, so that the two are never seen apart; between two changes of the
 * party it is told by itself, to every member who is there.
 */
function withFightTold(before: HostSession, step: HostStep, pack: DataPack, table: FightTable | undefined): HostStep {
  const toldParty = new Set(step.send.filter((entry) => entry.message.t === 'party').flatMap((entry) => entry.to))
  const others = step.session.party.filter((member) => member.present && !toldParty.has(member.peer)).map((member) => member.peer)

  if (!step.session.fight) {
    // The fight was closed: those not told the party just now are told there is none.
    if (!before.fight || others.length === 0) return step
    return { ...step, send: [...step.send, { to: others, message: { t: 'fight', fight: null } }] }
  }
  if (!table) throw new Error('A fight is on, and the engine that plays it was not handed in')

  // Who is there may have changed, and time has passed: the timer stops, starts or runs out accordingly.
  const settled = fightStep(step.session.fight, 'gm', { do: 'clock' }, contextOf(step.session, pack, table)).fight
  const session = settled === step.session.fight ? step.session : { ...step.session, fight: settled }
  const fight = partyView(settled, contextOf(session, pack, table))
  const send = step.send.map((entry) => (entry.message.t === 'party' ? { ...entry, message: { ...entry.message, fight } } : entry))
  if (settled !== before.fight && others.length > 0) send.push({ to: others, message: { t: 'fight', fight } })
  return { ...step, session, send }
}

function stepped(session: HostSession, event: HostEvent, pack: DataPack, table: FightTable | undefined): HostStep {
  switch (event.on) {
    case 'peer': {
      if (event.present) return { session, send: [] }
      // A device that left takes its request with it: it asks again when it is back.
      const requests = session.requests.filter((request) => request.peer !== event.peer)
      const member = session.party.find((entry) => entry.peer === event.peer)
      if (!member?.present) return { session: { ...session, requests }, send: [] }
      return changed({ ...session, requests, party: session.party.map((entry) => (entry === member ? { ...entry, present: false } : entry)) })
    }
    case 'campaign':
      // The copies of the characters are the session's own to write: one the device could not keep is still played with.
      return { session: { ...session, campaign: { ...event.campaign, characters: session.campaign.characters } }, send: [] }
    case 'offline':
      // Requests and presences were true of a line that is gone: every device says its piece again when it is back.
      return { session: { ...session, requests: [], party: session.party.map((member) => ({ ...member, present: false })) }, send: [] }
    case 'message':
      return heard(session, event.from, event.body, pack, table)
    case 'launched': {
      if (session.fight || !table) return { session, send: [] }
      const fighting: HostSession = { ...session, fight: openFight(event.start, contextOf(session, pack, table)), intents: {}, resting: [] }
      // A fight ends every rest: nobody chooses moves again once it has begun. The party is told when a rest was open.
      return session.resting?.length ? changed(fighting) : { session: fighting, send: [] }
    }
    case 'fight': {
      if (!session.fight || !table) return { session, send: [], refused: 'no-fight' }
      const step = fightStep(session.fight, 'gm', event.command, contextOf(session, pack, table))
      return { session: { ...session, fight: step.fight }, send: [], ...(step.refused ? { refused: step.refused } : {}) }
    }
    case 'clock':
      // The timer is looked at after every event, this one included.
      return { session, send: [] }
    case 'resumed':
      return session.fight || !table ? { session, send: [] } : { session: { ...session, fight: event.fight, intents: {} }, send: [] }
    case 'closeFight':
      return session.fight && table ? closed(session, session.fight, event.awards, pack, table) : { session, send: [] }
    case 'rest': {
      const member = session.party.find((entry) => entry.character.id === event.character)
      if (session.fight || !member) return { session, send: [], refused: session.fight ? 'fight-on' : 'unknown-character' }
      const result = rested(member.character, pack)
      if (!result.ok) return { session, send: [], refused: result.problem }
      // The rest is open until its player has chosen, or the next fight begins.
      return changed({ ...withCopies(session, [result.character]), resting: [...new Set([...(session.resting ?? []), event.character])] })
    }
    case 'grant': {
      const member = session.party.find((entry) => entry.character.id === event.character)
      if (session.fight || !member) return { session, send: [], refused: session.fight ? 'fight-on' : 'unknown-character' }
      const result = granted(member.character, event.grant, pack)
      if (!result.ok) return { session, send: [], refused: result.problem }
      const told: Granted = {
        exp: result.character.exp - member.character.exp,
        money: result.character.money - member.character.money,
        items: (event.grant.items ?? []).filter(({ quantity }) => quantity !== 0).map(({ item, quantity }) => ({ item, quantity })),
        ...(result.character.level > member.character.level ? { level: { from: member.character.level, to: result.character.level } } : {}),
      }
      return changed(withCopies(session, [result.character]), member.present ? [{ to: [member.peer], message: { t: 'granted', granted: told } }] : [])
    }
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

/** The session with these copies of characters in the place of those it had, in the party and in the campaign. */
function withCopies(session: HostSession, copies: readonly CharacterDocument[]): HostSession {
  const newer = (character: CharacterDocument): CharacterDocument => copies.find((copy) => copy.id === character.id) ?? character
  return {
    ...session,
    party: session.party.map((member) => ({ ...member, character: newer(member.character) })),
    campaign: { ...session.campaign, revision: session.campaign.revision + 1, characters: session.campaign.characters.map(newer) },
  }
}

/** A change a member asks of a sheet, made by the rules of src/domain: the characters it changed, or why it was not made. */
function sheetChanged(session: HostSession, own: CharacterDocument, change: SheetChange, pack: DataPack): { ok: true; characters: CharacterDocument[] } | { ok: false; problem: string } {
  const party = session.party.map((member) => member.character)
  const one = (result: { ok: true; character: CharacterDocument } | { ok: false; problem: string }) => (result.ok ? { ok: true as const, characters: [result.character] } : result)
  const several = (result: { ok: true; party: CharacterDocument[] } | { ok: false; problem: string }) => (result.ok ? { ok: true as const, characters: result.party } : result)
  switch (change.do) {
    case 'points':
      return one(withPointsPlaced(own, change, pack))
    case 'evolve':
      return one(evolved(own, change.to, pack))
    case 'reselect': {
      // Ability and moves are chosen again during a rest, and at no other time (spec, section 3).
      const rules = session.campaign.rulesHistory.find((version) => version.version === own.campaign.rulesVersion)
      if (!rules || !session.resting?.includes(own.id)) return { ok: false, problem: 'not-resting' }
      return one(reselected(own, change, rules, pack))
    }
    case 'item':
      return several(withItemUsed(party, { user: own.id, item: change.item, target: change.target, move: change.move, from: change.from }, pack))
    case 'take':
      return several(withItemsTaken(party, { taker: own.id, from: change.from, item: change.item, quantity: change.quantity }))
    case 'hold':
      return one(withHeldItem(own, change.item, pack))
  }
}

/** A member's change to a sheet, outside a fight: made once, by the rules, and answered either way. */
function asked(session: HostSession, peer: string, message: { id: string; change: SheetChange }, pack: DataPack): HostStep {
  const member = session.party.find((entry) => entry.peer === peer)
  if (!member) return { session, send: [] }
  const answer = (refused?: string): HostStep['send'] => [{ to: [peer], message: { t: 'changeAnswer', id: message.id, ...(refused ? { refused } : {}) } }]
  const made = session.changes?.[peer] ?? []
  // Sent twice, as a device does when it is not sure the first was heard: said again, not made again.
  if (made.includes(message.id)) return { session, send: answer() }
  // During a fight the sheets are the fight's: they change again once it is over.
  if (session.fight) return { session, send: answer('fight-on') }

  const result = sheetChanged(session, member.character, message.change, pack)
  if (!result.ok) return { session, send: answer(result.problem) }
  // Whatever the rules let through, a sheet that would no longer pass its campaign's rules is not kept.
  const valid = result.characters.every((character) => openCharacter(character, session.campaign.rulesHistory.find((version) => version.version === character.campaign.rulesVersion), pack).ok)
  if (!valid) return { session, send: answer('invalid') }

  const changes = { ...session.changes, [peer]: [...made, message.id].slice(-INTENTS_REMEMBERED) }
  // A rest is over once its player has chosen.
  const resting = message.change.do === 'reselect' ? (session.resting ?? []).filter((id) => id !== member.character.id) : session.resting
  const next = { ...withCopies(session, result.characters), changes, ...(resting ? { resting } : {}) }
  return changed(next, answer())
}

/**
 * The encounter is over: everyone who fought is left as the fight left them
 * (decision 136), every character named is awarded its EXP and Pokédollars
 * (decision 4), the copies go into the campaign, and each member is told what
 * they got before the party is told again, without a fight.
 */
function closed(session: HostSession, fight: Fight, awards: Readonly<Record<string, { exp: number; money: number }>>, pack: DataPack, table: FightTable): HostStep {
  const fought = new Map(table.engine.combatants().filter((combatant) => combatant.side === 'players').map((combatant) => [combatant.id, combatant]))
  const settled = (character: CharacterDocument): CharacterDocument => {
    const view = fought.get(character.id)
    const left = view ? afterFight(character, view, fight.bags[character.id] ?? character.bag) : character
    const award = awards[character.id]
    return award ? awarded(left, award.exp, award.money, pack) : left
  }
  const party = session.party.map((member) => ({ ...member, character: settled(member.character) }))
  // The campaign's own copies follow, those of the members and that of a player who left during the fight, whose Pokémon fought to the end.
  const characters = session.campaign.characters.map(settled)
  const told = session.party.flatMap((member, index): HostStep['send'] => {
    const award = awards[member.character.id]
    const after = party[index]?.character
    if (!member.present || !award || !after) return []
    const level = after.level > member.character.level ? { level: { from: member.character.level, to: after.level } } : {}
    return [{ to: [member.peer], message: { t: 'rewards', rewards: { encounter: fight.encounter.name, exp: after.exp - member.character.exp, money: after.money - member.character.money, ...level } } }]
  })
  const next: HostSession = { ...session, party, campaign: { ...session.campaign, revision: session.campaign.revision + 1, characters }, intents: {} }
  delete next.fight
  return changed(next, told)
}

/**
 * What the encounter being fought is worth to each character of the party, as
 * the game master is shown it before awarding (decisions 130, 134, 159 and
 * 160): every member of the party gets a line, and only the enemies defeated
 * so far are counted.
 */
export function rewardsOf(session: HostSession, pack: DataPack, table: FightTable | undefined): RewardDefaults | undefined {
  if (!session.fight || !table) return undefined
  const defeated = new Set(
    table.engine
      .combatants()
      .filter((combatant) => combatant.side === 'enemies' && combatant.dead)
      .map((combatant) => combatant.id),
  )
  const enemies = session.fight.enemies.filter((enemy) => defeated.has(enemy.id))
  return rewardDefaults({ id: session.fight.encounter.id, name: session.fight.encounter.name, enemies, bag: [] }, session.party.map((member) => member.character), pack)
}

/** A player's intent, as the command it is for the Pokémon of their own character. */
function commandOf(intent: Intent, who: string): FightCommand {
  switch (intent.do) {
    case 'lock':
      return { do: 'lock', who, choice: intent.choice }
    case 'unlock':
      return { do: 'unlock', who }
    case 'run':
    case 'switch':
      return { do: intent.do, who, with: intent.with }
    case 'answer':
      return { do: 'answer', who, kind: intent.kind, from: intent.from, accept: intent.accept }
    case 'withdraw':
      return { do: 'withdraw', who, kind: intent.kind }
  }
}

/** A member's intent in the fight: carried out for their own Pokémon, once, and answered either way. */
function intended(session: HostSession, peer: string, message: { id: string; round: number; intent: Intent }, pack: DataPack, table: FightTable | undefined): HostStep {
  const member = session.party.find((entry) => entry.peer === peer)
  // Only a member has a Pokémon to speak for.
  if (!member) return { session, send: [] }
  const answer = (refused?: string): HostStep['send'] => [{ to: [peer], message: { t: 'intentAnswer', id: message.id, ...(refused ? { refused } : {}) } }]
  if (!session.fight || !table) return { session, send: answer('no-fight') }
  const carriedOut = session.intents?.[peer] ?? []
  // Sent twice, as a device does when it is not sure the first was heard: said again, not done again.
  if (carriedOut.includes(message.id)) return { session, send: answer() }
  // Made for a round that has been played since: it is not carried out in the next.
  if (message.round !== session.fight.round) return { session, send: answer('stale') }

  const step = fightStep(session.fight, { player: member.character.id }, commandOf(message.intent, member.character.id), contextOf(session, pack, table))
  if (step.refused) return { session: { ...session, fight: step.fight }, send: answer(step.refused) }
  const intents = { ...session.intents, [peer]: [...carriedOut, message.id].slice(-INTENTS_REMEMBERED) }
  return { session: { ...session, fight: step.fight, intents }, send: answer() }
}

function heard(session: HostSession, peer: string, body: unknown, pack: DataPack, table: FightTable | undefined): HostStep {
  const decoded = decodeGuestMessage(body)
  // What cannot be read is not answered, except to say that the two apps are of different versions.
  if (!decoded.ok) return decoded.reason === 'version' ? refuse(session, peer, 'version') : { session, send: [] }
  const message = decoded.message

  if (message.t === 'intent') return intended(session, peer, message, pack, table)
  if (message.t === 'change') return asked(session, peer, message, pack)

  if (message.t === 'hello') {
    // What a creation link of the campaign would hold, as it stands now.
    const rules = session.campaign.rulesHistory.at(-1)
    if (!rules) return { session, send: [] }
    const invitation = { campaign: { id: session.campaign.id, name: session.campaign.name }, dataPackVersion: pack.version, rules }
    return { session, send: [{ to: [peer], message: { t: 'about', invitation } }] }
  }

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

export type LaunchRefusal = LaunchProblem | 'no-encounter' | 'fight-on'

export type SessionLaunch =
  | {
      ok: true
      /** What the engine is asked to play. */
      setup: BattleSetup
      /** What the fight starts with, beside what the engine says as the Pokémon enter. */
      start: Omit<FightStart, 'opening' | 'timerSeconds'>
    }
  | { ok: false; problem: LaunchRefusal }

/**
 * The fight an encounter of the campaign makes with the party as it stands:
 * every member's character, or those of `only`, in the party's order. A
 * member who is away fights too: the game master chooses for them (decision 16).
 */
export function launchFor(session: HostSession, encounterId: string, seed: string, only?: readonly string[]): SessionLaunch {
  if (session.fight) return { ok: false, problem: 'fight-on' }
  const encounter = session.campaign.encounters.find((kept) => kept.id === encounterId)
  if (!encounter) return { ok: false, problem: 'no-encounter' }
  const characters = session.party.map((member) => member.character).filter((character) => !only || only.includes(character.id))
  const launch = fightSetup(encounter, characters, seed)
  if (!launch.ok) return launch
  const fighting = characters.filter((character) => launch.fighting.includes(character.id))
  return {
    ok: true,
    setup: launch.setup,
    start: {
      encounter: { id: encounter.id, name: encounter.name },
      enemies: encounter.enemies,
      bags: Object.fromEntries(fighting.map((character) => [character.id, character.bag])),
      enemyBag: encounter.bag,
    },
  }
}
