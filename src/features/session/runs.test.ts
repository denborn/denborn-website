import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import type { RelayLink, RelayLinkOptions } from '../../network/relay-link'
import { CLOSED, type ClientFrame, type RelayFrame } from '../../shared/protocol/relay'
import { type GuestMessage, type HostMessage, encodeMessage } from '../../shared/protocol/session'
import type { CampaignDocument } from '../../shared/schema/campaign'
import type { CharacterDocument } from '../../shared/schema/character'
import type { GuestState } from './guest'
import { type HostView, runHost } from './run-host'
import { runGuest } from './run-guest'

const PEER = '0123456789abcdef'
const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [testRules()], characters: [], encounters: [] }

/** A line the test plays the relay's part on: what was sent on it, and the relay's words fed into it. */
function fakeLine() {
  const sent: ClientFrame[] = []
  let options: RelayLinkOptions | undefined
  let closed = false
  const open = (given: RelayLinkOptions): RelayLink => {
    options = given
    return {
      send: (frame) => {
        if (closed) return false
        sent.push(frame)
        return true
      },
      close: () => {
        closed = true
      },
    }
  }
  const relay = (): RelayLinkOptions => {
    if (!options) throw new Error('The line was never opened')
    return options
  }
  return { open, sent, says: (frame: RelayFrame) => relay().onFrame(frame), drops: (code: number, comingBack: boolean) => relay().onDown(code, comingBack), hello: () => relay().hello, url: () => relay().url, isClosed: () => closed }
}

const fromPlayer = (message: GuestMessage): RelayFrame => ({ t: 'msg', from: PEER, body: encodeMessage(message) })
const fromHost = (message: HostMessage): RelayFrame => ({ t: 'msg', body: encodeMessage(message) })

describe('a session being hosted', () => {
  function hosting(members: { peer: string; character: string }[] = [], kept = campaign) {
    const line = fakeLine()
    const views: HostView[] = []
    const copies: CampaignDocument['characters'][] = []
    const remembered: unknown[] = []
    const run = runHost({
      campaign: kept,
      pack: testPack,
      hosting: { code: 'ABCDEF', secret: 'host-secret-0123456789abcdef', members },
      origin: 'https://denborn.test',
      onChange: (view) => views.push(view),
      onCharacters: (characters) => copies.push(characters),
      onMembers: (list) => remembered.push(list),
      open: line.open,
    })
    return { line, views, copies, remembered, run }
  }

  it('claims its room with its secret, and is up once the relay says the room is its own', () => {
    const { line, run } = hosting()
    expect(line.url()).toBe('wss://denborn.test/ws/ABCDEF')
    expect(line.hello()).toEqual({ t: 'host', secret: 'host-secret-0123456789abcdef' })
    expect(run.view().line).toBe('connecting')
    line.says({ t: 'hosting', peers: [] })
    expect(run.view().line).toBe('up')
  })

  it('answers a player through the relay, and hands over what must be kept when the player is let in', () => {
    const { line, run, copies, remembered } = hosting()
    line.says({ t: 'hosting', peers: [] })
    line.says(fromPlayer({ t: 'ask', dataPackVersion: 'test-pack', character: newcomer() }))
    expect(line.sent).toEqual([{ t: 'send', to: [PEER], body: encodeMessage({ t: 'waiting' }) }])
    expect(run.view().session.requests).toHaveLength(1)

    run.approve(PEER, 'theirs')
    expect(line.sent.at(-1)).toMatchObject({ t: 'send', to: [PEER], body: { t: 'party' } })
    expect(copies.at(-1)?.map((character) => character.id)).toEqual(['character-0001'])
    expect(remembered.at(-1)).toEqual([{ peer: PEER, character: 'character-0001' }])
  })

  it('takes the session up again with the party it remembers', () => {
    const { run } = hosting([{ peer: PEER, character: 'character-0001' }], { ...campaign, characters: [newcomer()] })
    expect(run.view().session.party).toMatchObject([{ peer: PEER, present: false }])
  })

  it('counts everyone away while its line is down, and says why when the line is over', () => {
    const { line, run } = hosting([{ peer: PEER, character: 'character-0001' }], { ...campaign, characters: [newcomer()] })
    line.says({ t: 'hosting', peers: [PEER] })
    line.says(fromPlayer({ t: 'ask', dataPackVersion: 'test-pack', character: newcomer() }))
    expect(run.view().session.party).toMatchObject([{ present: true }])
    line.drops(1006, true)
    expect(run.view()).toMatchObject({ line: 'down', session: { party: [{ present: false }] } })
    line.drops(CLOSED.replaced, false)
    expect(run.view().line).toBe('replaced')
  })

  it('takes in the campaign changed on another screen without handing it back as its own change', () => {
    const { line, run, copies } = hosting()
    line.says({ t: 'hosting', peers: [] })
    run.refresh({ ...campaign, revision: 9, name: 'Renamed' })
    expect(run.view().session.campaign).toMatchObject({ revision: 9, name: 'Renamed' })
    expect(copies).toEqual([])
  })

  it('ends the session for everyone, and hosts that room no more', () => {
    const { line, run } = hosting()
    line.says({ t: 'hosting', peers: [] })
    run.end()
    expect(line.sent.at(-1)).toEqual({ t: 'end' })
    expect(line.isClosed()).toBe(true)
    expect(run.view().line).toBe('ended')
  })
})

describe('a session being joined', () => {
  function joining(character?: CharacterDocument) {
    const line = fakeLine()
    const states: GuestState[] = []
    const kept: CharacterDocument[] = []
    const run = runGuest({ code: 'ABCDEF', origin: 'https://denborn.test', token: 'player-token-0123456789abcdef', dataPackVersion: 'test-pack', character, onChange: (state) => states.push(state), onKeep: (copy) => kept.push(copy), open: line.open })
    return { line, states, kept, run }
  }
  const party = (character: CharacterDocument) => ({ revision: 1, campaign: { id: 'campaign-0001', name: 'Test' }, you: character.id, members: [{ character, present: true }] })

  it('comes into the room with its token, learns the campaign, and asks with the character chosen', () => {
    const { line, run } = joining()
    expect(line.hello()).toEqual({ t: 'join', token: 'player-token-0123456789abcdef' })
    line.says({ t: 'joined', peer: PEER, host: true })
    expect(line.sent).toEqual([{ t: 'send', body: encodeMessage({ t: 'hello' }) }])
    line.says(fromHost({ t: 'about', invitation: { campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules() } }))
    expect(run.state()).toMatchObject({ at: 'choosing' })
    run.choose(newcomer())
    expect(line.sent.at(-1)).toMatchObject({ t: 'send', body: { t: 'ask', character: { id: 'character-0001' } } })
    expect(run.state()).toEqual({ at: 'asking' })
  })

  it('asks at once when it comes back with the character it brought before', () => {
    const { line } = joining({ ...newcomer(), rules: testRules() })
    line.says({ t: 'joined', peer: PEER, host: true })
    expect(line.sent).toMatchObject([{ t: 'send', body: { t: 'ask' } }])
  })

  it('hands over the copy the game master’s side gives back, with the rules the device kept', () => {
    const { line, kept, run } = joining({ ...newcomer(), rules: testRules() })
    line.says({ t: 'joined', peer: PEER, host: true })
    line.says(fromHost({ t: 'party', party: party(newcomer({ money: 900 })) }))
    expect(run.state()).toMatchObject({ at: 'in' })
    expect(kept).toMatchObject([{ money: 900, rules: { version: 1 } }])
  })

  it('closes its line once it is out, and stays a member while the line merely dropped', () => {
    const member = joining(newcomer())
    member.line.says({ t: 'joined', peer: PEER, host: true })
    member.line.says(fromHost({ t: 'party', party: party(newcomer()) }))
    member.line.drops(1006, true)
    expect(member.run.state()).toMatchObject({ at: 'in', linked: false })
    expect(member.line.isClosed()).toBe(false)

    member.line.says({ t: 'joined', peer: PEER, host: true })
    member.line.says(fromHost({ t: 'removed' }))
    expect(member.run.state()).toEqual({ at: 'out', why: 'removed' })
    expect(member.line.isClosed()).toBe(true)
  })

  it('tells the game master before leaving', () => {
    const { line, run } = joining(newcomer())
    line.says({ t: 'joined', peer: PEER, host: true })
    line.says(fromHost({ t: 'party', party: party(newcomer()) }))
    run.leave()
    expect(line.sent.at(-1)).toEqual({ t: 'send', body: encodeMessage({ t: 'leave' }) })
    expect(run.state()).toEqual({ at: 'out', why: 'left' })
  })
})
