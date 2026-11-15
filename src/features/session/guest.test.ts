import { describe, expect, it } from 'vitest'
import { newcomer, testRules } from '../../domain/test-pack'
import { CLOSED } from '../../shared/protocol/relay'
import { type HostMessage, type Party, encodeMessage } from '../../shared/protocol/session'
import { GUEST_START, type GuestEvent, type GuestState, type Mine, guestStep } from './guest'

const mine: Mine = { character: { ...newcomer(), rules: testRules() }, dataPackVersion: 'test-pack' }
const says = (message: HostMessage): GuestEvent => ({ on: 'message', body: encodeMessage(message) })
const party = (changes: Partial<Party> = {}): Party => ({ revision: 1, campaign: { id: 'campaign-0001', name: 'Test' }, you: 'character-0001', members: [{ character: newcomer(), present: true }], ...changes })

/** Plays events one after the other and gives the state they leave, with everything sent and kept on the way. */
function play(state: GuestState, ...events: GuestEvent[]) {
  const sent: { t: string }[] = []
  const kept: unknown[] = []
  for (const event of events) {
    const step = guestStep(state, event, mine)
    state = step.state
    sent.push(...step.send)
    if (step.keep) kept.push(step.keep)
  }
  return { state, sent, kept }
}

const inSession = (): GuestState => play(GUEST_START, { on: 'joined', host: true }, says({ t: 'party', party: party() })).state

describe('a player who has not chosen a character yet', () => {
  const nobody: Mine = { character: undefined, dataPackVersion: 'test-pack' }
  const playing = (state: GuestState, who: Mine, ...events: GuestEvent[]) => {
    const sent: { t: string }[] = []
    for (const event of events) {
      const step = guestStep(state, event, who)
      state = step.state
      sent.push(...step.send)
    }
    return { state, sent }
  }

  it('asks which campaign is played, and is shown it to choose among its characters', () => {
    const met = playing(GUEST_START, nobody, { on: 'joined', host: true })
    expect(met).toEqual({ state: { at: 'meeting' }, sent: [{ t: 'hello' }] })
    const told = playing(met.state, nobody, says({ t: 'about', campaign: { id: 'campaign-0001', name: 'Test' } }))
    expect(told.state).toEqual({ at: 'choosing', campaign: { id: 'campaign-0001', name: 'Test' } })
  })

  it('asks to come in as soon as the character is chosen', () => {
    const choosing: GuestState = { at: 'choosing', campaign: { id: 'campaign-0001', name: 'Test' } }
    expect(playing(choosing, mine, { on: 'chosen' })).toMatchObject({ state: { at: 'asking' }, sent: [{ t: 'ask', character: { id: 'character-0001' } }] })
  })

  it('greets again when the game master comes back before a character was chosen', () => {
    const back = playing({ at: 'choosing', campaign: { id: 'campaign-0001', name: 'Test' } }, nobody, { on: 'host', present: false }, { on: 'host', present: true })
    expect(back).toEqual({ state: { at: 'meeting' }, sent: [{ t: 'hello' }] })
  })
})

describe('a player reaching a session', () => {
  it('asks with its character as soon as the game master is there, without the rules it keeps with it', () => {
    const { state, sent } = play(GUEST_START, { on: 'joined', host: true })
    expect(state).toEqual({ at: 'asking' })
    expect(sent).toMatchObject([{ t: 'ask', dataPackVersion: 'test-pack', character: { id: 'character-0001' } }])
    expect(sent[0]).not.toHaveProperty('character.rules')
  })

  it('waits for the game master to be there before asking', () => {
    const away = play(GUEST_START, { on: 'joined', host: false })
    expect(away).toMatchObject({ state: { at: 'hostAway' }, sent: [] })
    expect(play(away.state, { on: 'host', present: true })).toMatchObject({ state: { at: 'asking' }, sent: [{ t: 'ask' }] })
  })

  it('goes from asking to waiting to in, as the game master’s side answers', () => {
    const waiting = play(GUEST_START, { on: 'joined', host: true }, says({ t: 'waiting' }))
    expect(waiting.state).toEqual({ at: 'waiting' })
    expect(play(waiting.state, says({ t: 'party', party: party() })).state).toMatchObject({ at: 'in', linked: true, hostThere: true, party: { revision: 1 } })
  })

  it('is out when refused, with the reason', () => {
    expect(play(GUEST_START, { on: 'joined', host: true }, says({ t: 'refused', reason: 'full' })).state).toEqual({ at: 'out', why: 'refused', reason: 'full' })
  })
})

describe('a player in a session', () => {
  it('keeps the copy of its character the game master’s side gives back, when it is not the one it has', () => {
    const same = play(GUEST_START, { on: 'joined', host: true }, says({ t: 'party', party: party() }))
    expect(same.kept).toEqual([])
    const other = play(GUEST_START, { on: 'joined', host: true }, says({ t: 'party', party: party({ members: [{ character: newcomer({ money: 900 }), present: true }] }) }))
    expect(other.kept).toMatchObject([{ id: 'character-0001', money: 900 }])
  })

  it('takes the newest state of the party and ignores an older one that arrives late', () => {
    const later = play(inSession(), says({ t: 'party', party: party({ revision: 3 }) }), says({ t: 'party', party: party({ revision: 2 }) }))
    expect(later.state).toMatchObject({ at: 'in', party: { revision: 3 } })
  })

  it('stays in while the game master is away, and asks again when they are back', () => {
    const away = play(inSession(), { on: 'host', present: false })
    expect(away.state).toMatchObject({ at: 'in', hostThere: false })
    expect(play(away.state, { on: 'host', present: true })).toMatchObject({ state: { at: 'in', hostThere: true }, sent: [{ t: 'ask' }] })
  })

  it('stays a member while its own connection is down, and asks again once back in the room', () => {
    const dropped = play(inSession(), { on: 'closed', code: 1006 })
    expect(dropped.state).toMatchObject({ at: 'in', linked: false })
    expect(play(dropped.state, { on: 'joined', host: true })).toMatchObject({ state: { at: 'in', linked: true }, sent: [{ t: 'ask' }] })
  })

  it('is out when the game master removes it, and when it leaves by itself', () => {
    expect(play(inSession(), says({ t: 'removed' })).state).toEqual({ at: 'out', why: 'removed' })
    expect(play(inSession(), { on: 'leave' })).toMatchObject({ state: { at: 'out', why: 'left' }, sent: [{ t: 'leave' }] })
  })
})

describe('a connection that closes', () => {
  it('means out for good when the relay says why', () => {
    const closed = (code: number) => play(inSession(), { on: 'closed', code }).state
    expect(closed(CLOSED.ended)).toEqual({ at: 'out', why: 'ended' })
    expect(closed(CLOSED.replaced)).toEqual({ at: 'out', why: 'elsewhere' })
    expect(closed(CLOSED.version)).toEqual({ at: 'out', why: 'update' })
    expect(play(GUEST_START, { on: 'closed', code: CLOSED.noRoom }).state).toEqual({ at: 'out', why: 'noSession' })
  })

  it('means reaching again when it merely dropped before the player was in', () => {
    expect(play(GUEST_START, { on: 'joined', host: true }, says({ t: 'waiting' }), { on: 'closed', code: 1006 }).state).toEqual({ at: 'reaching' })
  })

  it('changes nothing once the player is out', () => {
    const out = play(inSession(), says({ t: 'removed' }))
    expect(play(out.state, { on: 'joined', host: true }, says({ t: 'party', party: party() }))).toMatchObject({ state: { at: 'out', why: 'removed' }, sent: [] })
  })

  it('asks for an update when the game master’s app speaks another version', () => {
    expect(play(GUEST_START, { on: 'joined', host: true }, { on: 'message', body: { p: 99, t: 'waiting' } }).state).toEqual({ at: 'out', why: 'update' })
  })
})
