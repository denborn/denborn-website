import { describe, expect, it } from 'vitest'
import { newcomer, testRules } from '../../domain/test-pack'
import { CLOSED } from '../../shared/protocol/relay'
import { type HostMessage, type Party, encodeMessage } from '../../shared/protocol/session'
import { GUEST_START, type GuestEvent, type GuestState, type Mine, guestStep } from './guest'

const mine: Mine = { character: { ...newcomer(), rules: testRules() }, dataPackVersion: 'test-pack' }
const says = (message: HostMessage): GuestEvent => ({ on: 'message', body: encodeMessage(message) })
const party = (changes: Partial<Party> = {}): Party => ({ revision: 1, campaign: { id: 'campaign-0001', name: 'Test' }, you: 'character-0001', members: [{ character: newcomer(), present: true, resting: false }], ...changes })

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

  const invitation = { campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules() }

  it('asks which campaign is played, and is given it with its rules, to choose a character or make one', () => {
    const met = playing(GUEST_START, nobody, { on: 'joined', host: true })
    expect(met).toEqual({ state: { at: 'meeting' }, sent: [{ t: 'hello' }] })
    expect(playing(met.state, nobody, says({ t: 'about', invitation })).state).toEqual({ at: 'choosing', invitation })
  })

  it('is told at once when the game master’s app carries other game data: nothing made or brought could be let in', () => {
    const told = playing({ at: 'meeting' }, nobody, says({ t: 'about', invitation: { ...invitation, dataPackVersion: 'newer-pack' } }))
    expect(told.state).toEqual({ at: 'out', why: 'refused', reason: 'other-data' })
  })

  it('asks to come in as soon as the character is chosen', () => {
    expect(playing({ at: 'choosing', invitation }, mine, { on: 'chosen' })).toMatchObject({ state: { at: 'asking' }, sent: [{ t: 'ask', character: { id: 'character-0001' } }] })
  })

  it('greets again when the game master comes back before a character was chosen', () => {
    const back = playing({ at: 'choosing', invitation }, nobody, { on: 'host', present: false }, { on: 'host', present: true })
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
    const other = play(GUEST_START, { on: 'joined', host: true }, says({ t: 'party', party: party({ members: [{ character: newcomer({ money: 900 }), present: true, resting: false }] }) }))
    expect(other.kept).toMatchObject([{ id: 'character-0001', money: 900 }])
  })

  it('takes the newest state of the party and ignores an older one that arrives late', () => {
    const later = play(inSession(), says({ t: 'party', party: party({ revision: 3 }) }), says({ t: 'party', party: party({ revision: 2 }) }))
    expect(later.state).toMatchObject({ at: 'in', party: { revision: 3 } })
  })

  it('takes what a game master who started the session over says as news, whatever its number', () => {
    // Told the party's fifth state, then the game master's app reloads: the session counts from the beginning again.
    const before = play(inSession(), says({ t: 'party', party: party({ revision: 5 }) }), { on: 'host', present: false }, { on: 'host', present: true })
    const after = play(before.state, says({ t: 'party', party: party({ revision: 1, members: [{ character: newcomer(), present: false, resting: false }] }) }))
    expect(after.state).toMatchObject({ at: 'in', party: { revision: 1, members: [{ present: false }] } })
    // From then on, an older state arriving late is ignored again.
    const later = play(after.state, says({ t: 'party', party: party({ revision: 4 }) }), says({ t: 'party', party: party({ revision: 3 }) }))
    expect(later.state).toMatchObject({ party: { revision: 4 } })
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

describe('a change asked of a sheet (milestone 7)', () => {
  const hold = { on: 'change', id: 'change-0001', change: { do: 'hold' } } as const

  it('is asked of a game master who is there to hear, by a member', () => {
    expect(play(inSession(), hold).sent).toEqual([{ t: 'change', id: 'change-0001', change: { do: 'hold' } }])
    expect(play(inSession(), { on: 'host', present: false }, hold).sent).toEqual([])
    expect(play(inSession(), { on: 'closed', code: 1006 }, hold).sent).toEqual([])
    expect(play({ at: 'waiting' }, hold).sent).toEqual([])
  })

  it('is answered: made, or why not; the answer stays through the next news of the party', () => {
    const answered = play(inSession(), says({ t: 'changeAnswer', id: 'change-0001', refused: 'no-item' }), says({ t: 'party', party: party({ revision: 2 }) }))
    expect(answered.state).toMatchObject({ at: 'in', changed: { id: 'change-0001', refused: 'no-item' }, party: { revision: 2 } })
    expect(play(inSession(), says({ t: 'changeAnswer', id: 'change-0002' })).state).toMatchObject({ changed: { id: 'change-0002' } })
    // Someone who is not in the session has no change to hear of.
    expect(play({ at: 'waiting' }, says({ t: 'changeAnswer', id: 'change-0001' })).state).toEqual({ at: 'waiting' })
  })

  it('keeps what the game master gave until the player has read it, through news of the party and a return', () => {
    const granted = { exp: 10, money: -5, items: [{ item: 'potion', quantity: 1 }] }
    const told = play(inSession(), says({ t: 'granted', granted }), says({ t: 'party', party: party({ revision: 2 }) }), { on: 'host', present: false }, { on: 'host', present: true })
    expect(told.state).toMatchObject({ at: 'in', granted })
    const read = play(told.state, { on: 'grantedRead' }).state
    expect(read.at === 'in' && 'granted' in read).toBe(false)
  })
})
