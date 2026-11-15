import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import { PARTY_MAX } from '../../game-rules/party'
import { type GuestMessage, encodeMessage } from '../../shared/protocol/session'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { CharacterDocument } from '../../shared/schema/character'
import { type HostEvent, type HostSession, hostStep, openSession } from './host'

const campaign = (changes: Partial<CampaignDocument> = {}): CampaignDocument => ({
  kind: 'denborn.campaign',
  schemaVersion: 1,
  id: 'campaign-0001',
  revision: 0,
  dataPackVersion: 'test-pack',
  name: 'Test',
  rulesHistory: [testRules()],
  characters: [], encounters: [],
  ...changes,
})

const hero = (id: string, changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ id, ...changes })
const asks = (character: CharacterDocument, dataPackVersion = 'test-pack'): unknown => encodeMessage({ t: 'ask', dataPackVersion, character } satisfies GuestMessage)

/** Plays events one after the other and gives the session they leave, with everything sent on the way. */
function play(session: HostSession, ...events: HostEvent[]) {
  const sent: { to: string[]; message: { t: string } }[] = []
  for (const event of events) {
    const step = hostStep(session, event, testPack)
    session = step.session
    sent.push(...step.send)
  }
  return { session, sent }
}

const from = (peer: string, body: unknown): HostEvent => ({ on: 'message', from: peer, body })
/** A session with these players asked in and approved, in order. */
const withParty = (...peers: string[]): HostSession =>
  play(openSession(campaign()), ...peers.flatMap((peer): HostEvent[] => [from(peer, asks(hero(`hero-${peer}`))), { on: 'approve', peer, keep: 'theirs' }])).session

describe('a player asking to come in', () => {
  it('is told which campaign is played, with the rules in force a character is made under (decision 128)', () => {
    const history = [testRules(), testRules({ version: 2, startingLevel: 30 })]
    expect(play(openSession(campaign({ rulesHistory: history })), from('ann', encodeMessage({ t: 'hello' }))).sent).toEqual([
      { to: ['ann'], message: { t: 'about', invitation: { campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: history[1] } } },
    ])
  })

  it('waits for the game master’s answer, and is in once approved', () => {
    const asked = play(openSession(campaign()), from('ann', asks(hero('hero-ann'))))
    expect(asked.sent).toEqual([{ to: ['ann'], message: { t: 'waiting' } }])
    expect(asked.session.requests).toMatchObject([{ peer: 'ann', standing: 'new' }])
    expect(asked.session.party).toEqual([])

    const approved = play(asked.session, { on: 'approve', peer: 'ann', keep: 'theirs' })
    expect(approved.session.requests).toEqual([])
    expect(approved.session.party).toMatchObject([{ peer: 'ann', present: true, character: { id: 'hero-ann' } }])
    expect(approved.sent).toMatchObject([{ to: ['ann'], message: { t: 'party', party: { revision: 1, you: 'hero-ann', members: [{ present: true }] } } }])
    // The copy let in is now the game master's own.
    expect(approved.session.campaign.characters.map((character) => character.id)).toEqual(['hero-ann'])
    expect(approved.session.campaign.revision).toBe(1)
  })

  it('is refused at once, before the game master sees anything, when the character cannot be played here', () => {
    const session = openSession(campaign())
    const refusal = (body: unknown) => play(session, from('ann', body))
    expect(refusal(asks(hero('hero-ann'), 'older-pack')).sent).toEqual([{ to: ['ann'], message: { t: 'refused', reason: 'other-data' } }])
    expect(refusal(asks(hero('hero-ann', { campaign: { id: 'campaign-9999', name: 'Other', rulesVersion: 1 } }))).sent).toMatchObject([{ message: { reason: 'other-campaign' } }])
    expect(refusal(asks(hero('hero-ann', { ability: 'sturdy' }))).sent).toMatchObject([{ message: { reason: 'invalid' } }])
    expect(refusal(asks(hero('hero-ann', { campaign: { id: 'campaign-0001', name: 'Test', rulesVersion: 7 } }))).sent).toMatchObject([{ message: { reason: 'invalid' } }])
    expect(refusal({ ...(asks(hero('hero-ann')) as object), p: 99 }).sent).toMatchObject([{ message: { reason: 'version' } }])
    expect(refusal('nonsense')).toMatchObject({ sent: [], session: { requests: [] } })
  })

  it('is told no when the game master declines', () => {
    const declined = play(openSession(campaign()), from('ann', asks(hero('hero-ann'))), { on: 'decline', peer: 'ann' })
    expect(declined.sent.at(-1)).toEqual({ to: ['ann'], message: { t: 'refused', reason: 'declined' } })
    expect(declined.session).toMatchObject({ requests: [], party: [] })
  })

  it('takes its request away with it when its device leaves', () => {
    const left = play(openSession(campaign()), from('ann', asks(hero('hero-ann'))), { on: 'peer', peer: 'ann', present: false })
    expect(left.session.requests).toEqual([])
  })
})

describe('the character the game master already has a copy of (decision 13)', () => {
  const mine = hero('hero-ann', { revision: 4, money: 900 })
  const session = openSession(campaign({ characters: [mine] }))

  it('is shown with both copies and which is more recent when they differ', () => {
    expect(play(session, from('ann', asks(hero('hero-ann', { revision: 5, money: 100 })))).session.requests).toMatchObject([{ standing: 'newer', kept: { money: 900 } }])
    expect(play(session, from('ann', asks(hero('hero-ann', { revision: 3 })))).session.requests).toMatchObject([{ standing: 'older' }])
    expect(play(session, from('ann', asks(hero('hero-ann', { revision: 4, money: 901 })))).session.requests).toMatchObject([{ standing: 'differs' }])
  })

  it('has nothing to choose when the two are alike, whatever rules the player’s copy carries', () => {
    const request = play(session, from('ann', asks({ ...mine, rules: testRules() }))).session.requests[0]
    expect(request).toMatchObject({ standing: 'same' })
    expect(request?.kept).toBeUndefined()
  })

  it('comes in as the copy the game master picks, and the player is given that one back', () => {
    const asked = play(session, from('ann', asks(hero('hero-ann', { revision: 5, money: 100 }))))
    const kept = play(asked.session, { on: 'approve', peer: 'ann', keep: 'mine' })
    expect(kept.sent).toMatchObject([{ message: { party: { members: [{ character: { money: 900 } }] } } }])
    expect(kept.session.campaign.characters).toMatchObject([{ money: 900 }])
    const taken = play(asked.session, { on: 'approve', peer: 'ann', keep: 'theirs' })
    expect(taken.session.campaign.characters).toMatchObject([{ money: 100 }])
  })
})

describe('the party', () => {
  it('is told again to everyone there each time it changes, each one with their own character named', () => {
    const { sent, session } = play(withParty('ann'), from('bob', asks(hero('hero-bob'))), { on: 'approve', peer: 'bob', keep: 'theirs' })
    expect(sent.slice(1)).toMatchObject([
      { to: ['ann'], message: { t: 'party', party: { revision: 2, you: 'hero-ann' } } },
      { to: ['bob'], message: { t: 'party', party: { revision: 2, you: 'hero-bob' } } },
    ])
    expect(session.party.map((member) => member.peer)).toEqual(['ann', 'bob'])
  })

  it(`holds ${PARTY_MAX} characters and refuses the next`, () => {
    const full = withParty(...Array.from({ length: PARTY_MAX }, (_, index) => `player${index}`))
    expect(full.party).toHaveLength(PARTY_MAX)
    expect(play(full, from('late', asks(hero('hero-late')))).sent).toEqual([{ to: ['late'], message: { t: 'refused', reason: 'full' } }])
  })

  it('does not approve a request left waiting once the party filled up', () => {
    const almost = withParty(...Array.from({ length: PARTY_MAX - 1 }, (_, index) => `player${index}`))
    const two = play(almost, from('xavier', asks(hero('hero-xavier'))), from('yvonne', asks(hero('hero-yvonne'))), { on: 'approve', peer: 'xavier', keep: 'theirs' }, { on: 'approve', peer: 'yvonne', keep: 'theirs' })
    expect(two.session.party).toHaveLength(PARTY_MAX)
    expect(two.session.requests.map((request) => request.peer)).toEqual(['yvonne'])
  })

  it('takes one character per device, and one device per character (decision 119)', () => {
    const session = withParty('ann')
    expect(play(session, from('ann', asks(hero('hero-other')))).sent).toMatchObject([{ message: { reason: 'already-in' } }])
    expect(play(session, from('bob', asks(hero('hero-ann')))).sent).toMatchObject([{ message: { reason: 'already-in' } }])
  })

  it('keeps a member whose device dropped, says so to the others, and takes it back without asking the game master again', () => {
    const dropped = play(withParty('ann', 'bob'), { on: 'peer', peer: 'ann', present: false })
    expect(dropped.session.party).toMatchObject([{ peer: 'ann', present: false }, { peer: 'bob', present: true }])
    expect(dropped.sent).toMatchObject([{ to: ['bob'], message: { party: { members: [{ present: false }, { present: true }] } } }])

    // The device comes back with an older state of its character: the session's copy is the one given back.
    const back = play(dropped.session, from('ann', asks(hero('hero-ann', { money: 1 }))))
    expect(back.session.requests).toEqual([])
    expect(back.session.party).toMatchObject([{ present: true, character: { money: 500 } }, { present: true }])
    expect(back.sent.map((entry) => entry.to)).toEqual([['ann'], ['bob']])
  })

  it('lets the game master take a member out: that player is told, and so are the others (decision 123)', () => {
    const removed = play(withParty('ann', 'bob'), { on: 'remove', peer: 'ann' })
    expect(removed.sent).toMatchObject([
      { to: ['ann'], message: { t: 'removed' } },
      { to: ['bob'], message: { t: 'party', party: { members: [{ character: { id: 'hero-bob' } }] } } },
    ])
    // The game master keeps the copy; the player may ask again.
    expect(removed.session.campaign.characters.map((character) => character.id)).toContain('hero-ann')
    expect(play(removed.session, from('ann', asks(hero('hero-ann')))).sent).toEqual([{ to: ['ann'], message: { t: 'waiting' } }])
  })

  it('lets a member leave by themselves', () => {
    const left = play(withParty('ann', 'bob'), from('ann', encodeMessage({ t: 'leave' })))
    expect(left.session.party.map((member) => member.peer)).toEqual(['bob'])
    expect(left.sent.map((entry) => entry.to)).toEqual([['bob']])
  })
})

describe('the campaign changed on another screen while the session goes on (decision 143)', () => {
  it('is played with from then on, with the copies of the characters the session holds, and nobody is told', () => {
    const changed = campaign({ revision: 7, name: 'Renamed', rulesHistory: [testRules(), testRules({ version: 2, startingLevel: 30 })] })
    const taken = play(withParty('ann'), { on: 'campaign', campaign: changed })
    expect(taken.sent).toEqual([])
    expect(taken.session.campaign).toMatchObject({ revision: 7, name: 'Renamed' })
    expect(taken.session.campaign.characters.map((character) => character.id)).toEqual(['hero-ann'])
    expect(taken.session.party).toMatchObject([{ peer: 'ann', present: true }])

    // The next player is told the rules now in force.
    const told = play(taken.session, from('bob', encodeMessage({ t: 'hello' })))
    expect(told.sent).toMatchObject([{ to: ['bob'], message: { t: 'about', invitation: { campaign: { name: 'Renamed' }, rules: { version: 2 } } } }])
  })
})

describe('a session taken up again (decision 122)', () => {
  const before = withParty('ann', 'bob')
  const remembered = before.party.map((member) => ({ peer: member.peer, character: member.character.id }))

  it('starts with the members the device remembers, each away until its device speaks', () => {
    const again = openSession(before.campaign, [...remembered, { peer: 'gone', character: 'hero-nobody' }])
    expect(again.party).toMatchObject([{ peer: 'ann', present: false, character: { id: 'hero-ann' } }, { peer: 'bob', present: false }])
    // A member that says "I am back" is in at once: the game master is not asked again.
    const back = play(again, from('ann', asks(hero('hero-ann'))))
    expect(back.session.requests).toEqual([])
    expect(back.session.party).toMatchObject([{ present: true }, { present: false }])
  })

  it('counts everyone away, and forgets the requests, when the game master’s own line drops', () => {
    const waiting = play(before, from('cid', asks(hero('hero-cid')))).session
    const dropped = play(waiting, { on: 'offline' })
    expect(dropped.session.party.map((member) => member.present)).toEqual([false, false])
    expect(dropped.session.requests).toEqual([])
    expect(dropped.sent).toEqual([])
  })
})
