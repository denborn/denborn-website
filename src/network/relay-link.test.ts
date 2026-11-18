import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLOSED, type RelayFrame, encodeFrame } from '../shared/protocol/relay'
import { CLOSED_SILENT, PING_EVERY_MS, PONG_WITHIN_MS, RETRY_FIRST_MS, RETRY_MOST_MS, type SocketLike, openRelayLink, roomUrl } from './relay-link'

const SECRET = 'host-secret-0123456789abcdef'

/** A socket the test plays the relay's part on. */
class FakeSocket implements SocketLike {
  sent: string[] = []
  closedWith: number | undefined
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  send(text: string): void {
    this.sent.push(text)
  }
  close(code?: number): void {
    this.closedWith = code
  }
  opens(): void {
    this.onopen?.()
  }
  says(frame: RelayFrame | string): void {
    this.onmessage?.({ data: typeof frame === 'string' ? frame : encodeFrame(frame) })
  }
  drops(code = 1006): void {
    this.onclose?.({ code })
  }
}

/** A line whose sockets the test holds, with everything its owner was told. */
function line() {
  const sockets: FakeSocket[] = []
  const told: unknown[] = []
  const latencies: (number | undefined)[] = []
  const link = openRelayLink({
    url: 'wss://denborn.test/ws/ABCDEF',
    hello: { t: 'host', secret: SECRET },
    onUp: () => told.push('up'),
    onFrame: (frame) => told.push(frame),
    onDown: (code, comingBack) => told.push({ down: code, comingBack }),
    onLatency: (milliseconds) => latencies.push(milliseconds),
    // The test's own clock, which its timers move.
    now: () => Date.now(),
    connect: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
    // The longest wait each time: the tests then know exactly when the line comes back.
    random: () => 1,
  })
  const last = (): FakeSocket => {
    const socket = sockets.at(-1)
    if (!socket) throw new Error('No socket was opened')
    return socket
  }
  return { link, sockets, told, latencies, last }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('a line to the relay', () => {
  it('says who it is as soon as it is connected, and passes on what the relay says', () => {
    const { last, told } = line()
    last().opens()
    // Its first word is who it is; the check of the line comes after.
    expect(last().sent).toEqual([encodeFrame({ t: 'host', secret: SECRET }), 'ping'])
    last().says({ t: 'hosting', peers: [] })
    expect(told).toEqual(['up', { t: 'hosting', peers: [] }])
  })

  it('sends only while connected, and keeps nothing to send later', () => {
    const { link, last } = line()
    expect(link.send({ t: 'end' })).toBe(false)
    last().opens()
    expect(link.send({ t: 'end' })).toBe(true)
    last().drops()
    expect(link.send({ t: 'end' })).toBe(false)
    expect(last().sent.filter((text) => text !== 'ping')).toHaveLength(2)
  })

  it('comes back by itself after a drop, and says who it is again', () => {
    const { sockets, last, told } = line()
    last().opens()
    last().drops()
    expect(told.at(-1)).toEqual({ down: 1006, comingBack: true })
    vi.advanceTimersByTime(RETRY_FIRST_MS - 1)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(2)
    last().opens()
    expect(last().sent[0]).toBe(encodeFrame({ t: 'host', secret: SECRET }))
  })

  it('waits twice as long after each drop in a row, up to the most, and starts over once the relay is heard again', () => {
    const { sockets, last } = line()
    const waits: number[] = []
    for (let drop = 0; drop < 6; drop++) {
      last().drops()
      const before = sockets.length
      let waited = 0
      while (sockets.length === before) {
        vi.advanceTimersByTime(500)
        waited += 500
      }
      waits.push(waited)
    }
    expect(waits).toEqual([RETRY_FIRST_MS, 2000, 4000, 8000, RETRY_MOST_MS, RETRY_MOST_MS])

    last().opens()
    last().says({ t: 'hosting', peers: [] })
    last().drops()
    vi.advanceTimersByTime(RETRY_FIRST_MS)
    expect(sockets).toHaveLength(8)
  })

  it.each([CLOSED.ended, CLOSED.noRoom, CLOSED.replaced, CLOSED.notHost, CLOSED.version])('does not come back once the relay closed it with %i', (code) => {
    const { sockets, last, told } = line()
    last().opens()
    last().drops(code)
    expect(told.at(-1)).toEqual({ down: code, comingBack: false })
    vi.advanceTimersByTime(RETRY_MOST_MS * 4)
    expect(sockets).toHaveLength(1)
  })

  it('checks the line as soon as it is connected and then now and then, and takes any word from the relay as an answer', () => {
    const { last, told } = line()
    last().opens()
    expect(last().sent.at(-1)).toBe('ping')
    last().says('pong')
    vi.advanceTimersByTime(PING_EVERY_MS)
    expect(last().sent.filter((text) => text === 'ping')).toHaveLength(2)
    last().says('pong')
    vi.advanceTimersByTime(PONG_WITHIN_MS)
    expect(last().closedWith).toBeUndefined()
    // A pong is the line's own business: the owner is not told.
    expect(told).toEqual(['up'])

    vi.advanceTimersByTime(PING_EVERY_MS - PONG_WITHIN_MS)
    last().says({ t: 'peer', peer: '0123456789abcdef', present: true })
    vi.advanceTimersByTime(PONG_WITHIN_MS)
    expect(last().closedWith).toBeUndefined()
  })

  it('gives up a connection the relay no longer answers on, and comes back', () => {
    const { sockets, last, told } = line()
    const first = last()
    first.opens()
    vi.advanceTimersByTime(PONG_WITHIN_MS - 1)
    expect(first.closedWith).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(first.closedWith).toBe(CLOSED_SILENT)
    expect(told.at(-1)).toEqual({ down: CLOSED_SILENT, comingBack: true })
    // The browser's own close event, arriving late, is not a second drop.
    first.drops()
    expect(told.filter((entry) => typeof entry === 'object' && entry !== null && 'down' in entry)).toHaveLength(1)
    vi.advanceTimersByTime(RETRY_FIRST_MS)
    expect(sockets).toHaveLength(2)
  })

  it('tells how long the relay took to answer each check, and that nothing is known once the line is down', () => {
    const { last, latencies } = line()
    last().opens()
    vi.advanceTimersByTime(48)
    last().says('pong')
    expect(latencies).toEqual([48])
    // A pong nobody asked for, or a second one, measures nothing.
    last().says('pong')
    expect(latencies).toEqual([48])

    vi.advanceTimersByTime(PING_EVERY_MS - 48)
    vi.advanceTimersByTime(310)
    // Another word from the relay shows the line is alive, and is not the answer that is timed.
    last().says({ t: 'hosting', peers: [] })
    vi.advanceTimersByTime(5)
    last().says('pong')
    expect(latencies).toEqual([48, 315])

    last().drops()
    expect(latencies).toEqual([48, 315, undefined])
  })

  it('is over when the relay speaks another version', () => {
    const { sockets, last, told } = line()
    last().opens()
    last().says(JSON.stringify({ v: 99, t: 'hosting', peers: [] }))
    expect(told.at(-1)).toEqual({ down: CLOSED.version, comingBack: false })
    vi.advanceTimersByTime(RETRY_MOST_MS)
    expect(sockets).toHaveLength(1)
  })

  it('says nothing more and does not come back once its owner closed it', () => {
    const { link, sockets, last, told } = line()
    last().opens()
    link.close()
    expect(last().closedWith).toBe(1000)
    const sentBefore = last().sent.length
    last().drops()
    last().says({ t: 'hosting', peers: [] })
    vi.advanceTimersByTime(PING_EVERY_MS * 4)
    expect(told).toEqual(['up'])
    expect(sockets).toHaveLength(1)
    // Not even a check of the line goes out any more.
    expect(last().sent).toHaveLength(sentBefore)
  })

  it('stays closed when its owner closed it while it was waiting to come back', () => {
    const { link, sockets, last } = line()
    last().opens()
    last().drops()
    link.close()
    vi.advanceTimersByTime(RETRY_MOST_MS * 4)
    expect(sockets).toHaveLength(1)
  })
})

describe('a room’s address', () => {
  it('is on the site the page came from, secure when the page is', () => {
    expect(roomUrl('ABCDEF', 'https://denborn.test')).toBe('wss://denborn.test/ws/ABCDEF')
    expect(roomUrl('ABCDEF', 'http://localhost:5173')).toBe('ws://localhost:5173/ws/ABCDEF')
  })
})
