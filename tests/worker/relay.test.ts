import { listDurableObjectIds, runDurableObjectAlarm } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { CLOSED, type ClientFrame, FRAMES_PER_SECOND_MAX, MAX_FRAME_LENGTH, type RelayFrame, decodeRelayFrame, encodeFrame } from '../../src/shared/protocol/relay'
import { makeRoomCode } from '../../src/shared/protocol/room-code'

const ORIGIN = 'https://denborn.test'

/** A room of its own for each test: what one leaves behind never reaches another. */
let rooms = 0
const newRoom = (): string => makeRoomCode(new Uint8Array([++rooms, 42, 99, 150, 201]))

const HOST_SECRET = 'host-secret-0123456789abcdef'
const playerToken = (name: string): string => `${name}-token-0123456789abcdef`

function upgrade(code: string, headers: Record<string, string> = {}): Promise<Response> {
  return exports.default.fetch(new Request(`${ORIGIN}/ws/${code}`, { headers: { Upgrade: 'websocket', Origin: ORIGIN, ...headers } }))
}

/** One end of a connection to a room: what it sends, what it hears in order, and how it was closed. */
interface Line {
  send(frame: ClientFrame): void
  raw(text: string): void
  /** The next thing heard: a relay frame, or the text itself when it is no frame. */
  next(): Promise<RelayFrame | string>
  /** Nothing more was heard for a moment. */
  quiet(): Promise<boolean>
  /** The code the connection was closed with. */
  closed: Promise<number>
  close(): void
}

async function connect(code: string): Promise<Line> {
  const response = await upgrade(code)
  const socket = response.webSocket
  if (response.status !== 101 || socket === null) throw new Error(`No WebSocket on the upgrade response (${response.status})`)
  socket.accept()
  const heard: string[] = []
  const waiting: ((text: string) => void)[] = []
  socket.addEventListener('message', (event) => {
    const text = String(event.data)
    const next = waiting.shift()
    if (next) next(text)
    else heard.push(text)
  })
  const closed = new Promise<number>((resolve) => {
    socket.addEventListener('close', (event) => resolve(event.code))
  })
  const nextText = (): Promise<string> => {
    const ready = heard.shift()
    if (ready !== undefined) return Promise.resolve(ready)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Nothing was heard')), 2000)
      waiting.push((text) => {
        clearTimeout(timer)
        resolve(text)
      })
    })
  }
  return {
    send: (frame) => socket.send(encodeFrame(frame)),
    raw: (text) => socket.send(text),
    next: async () => {
      const text = await nextText()
      const decoded = decodeRelayFrame(text)
      return decoded.ok ? decoded.frame : text
    },
    quiet: async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return heard.length === 0
    },
    closed,
    close: () => socket.close(1000),
  }
}

/** A room with its host in, and the players named, each with the peer id the host knows them by. */
async function session(...names: string[]): Promise<{ code: string; host: Line; players: { line: Line; peer: string }[] }> {
  const code = newRoom()
  const host = await connect(code)
  host.send({ t: 'host', secret: HOST_SECRET })
  expect(await host.next()).toEqual({ t: 'hosting', peers: [] })
  const players: { line: Line; peer: string }[] = []
  for (const name of names) {
    const line = await connect(code)
    line.send({ t: 'join', token: playerToken(name) })
    const joined = await line.next()
    if (typeof joined === 'string' || joined.t !== 'joined') throw new Error('The player was not let in')
    expect(joined.host).toBe(true)
    expect(await host.next()).toEqual({ t: 'peer', peer: joined.peer, present: true })
    players.push({ line, peer: joined.peer })
  }
  return { code, host, players }
}

describe('reaching a room', () => {
  it('answers the system check: a text that says it is a probe comes straight back', async () => {
    const line = await connect(newRoom())
    line.raw('probe:hello')
    expect(await line.next()).toBe('probe:hello')
  })

  it('refuses a mistyped code without creating a Durable Object', async () => {
    const code = newRoom()
    const before = (await listDurableObjectIds(env.ROOM)).length
    const lastSymbol = code.slice(-1) === '2' ? '3' : '2'
    const response = await upgrade(code.slice(0, -1) + lastSymbol)

    expect(response.status).toBe(404)
    expect((await listDurableObjectIds(env.ROOM)).length).toBe(before)
  })

  it('refuses a page from another origin', async () => {
    expect((await upgrade(newRoom(), { Origin: 'https://elsewhere.test' })).status).toBe(403)
  })

  it('refuses a plain HTTP request to a room', async () => {
    expect((await exports.default.fetch(new Request(`${ORIGIN}/ws/${newRoom()}`))).status).toBe(426)
  })
})

describe('a session’s room', () => {
  it('passes a player’s message to the host with who sent it, and the host’s to the players it names only', async () => {
    const { host, players } = await session('ann', 'bob')
    const [ann, bob] = players
    if (!ann || !bob) throw new Error('Two players were asked for')
    expect(ann.peer).not.toBe(bob.peer)

    ann.line.send({ t: 'send', body: { hello: 'from ann' } })
    expect(await host.next()).toEqual({ t: 'msg', from: ann.peer, body: { hello: 'from ann' } })

    host.send({ t: 'send', to: [bob.peer], body: 'for bob' })
    expect(await bob.line.next()).toEqual({ t: 'msg', body: 'for bob' })
    expect(await ann.line.quiet()).toBe(true)
  })

  it('tells the players when the host goes and comes back, and holds no message meanwhile', async () => {
    const { code, host, players } = await session('ann')
    const ann = players[0]
    if (!ann) throw new Error('A player was asked for')
    host.close()
    expect(await ann.line.next()).toEqual({ t: 'host', present: false })

    ann.line.send({ t: 'send', body: 'anyone?' })
    expect(await ann.line.next()).toEqual({ t: 'host', present: false })

    const back = await connect(code)
    back.send({ t: 'host', secret: HOST_SECRET })
    // The host is told who waited; the message sent meanwhile is not kept for it.
    expect(await back.next()).toEqual({ t: 'hosting', peers: [ann.peer] })
    expect(await ann.line.next()).toEqual({ t: 'host', present: true })
    expect(await back.quiet()).toBe(true)
  })

  it('tells the host when a player goes', async () => {
    const { host, players } = await session('ann')
    players[0]?.line.close()
    expect(await host.next()).toEqual({ t: 'peer', peer: players[0]?.peer, present: false })
  })

  it('stays the room of the first secret it heard', async () => {
    const { code, host } = await session()
    const thief = await connect(code)
    thief.send({ t: 'host', secret: 'another-secret-0123456789abcdef' })
    expect(await thief.closed).toBe(CLOSED.notHost)
    // The host is still the host.
    const ann = await connect(code)
    ann.send({ t: 'join', token: playerToken('ann') })
    expect(await ann.next()).toMatchObject({ t: 'joined', host: true })
    expect(await host.next()).toMatchObject({ t: 'peer', present: true })
  })

  it('lets the host connect again elsewhere: the newer connection stays, and the players are not told the host left', async () => {
    const { code, host, players } = await session('ann')
    const again = await connect(code)
    again.send({ t: 'host', secret: HOST_SECRET })
    expect(await again.next()).toEqual({ t: 'hosting', peers: [players[0]?.peer] })
    expect(await host.closed).toBe(CLOSED.replaced)
    expect(await players[0]?.line.quiet()).toBe(true)
  })

  it('knows a player who comes back by the same token as the same player', async () => {
    const { code, host, players } = await session('ann')
    const again = await connect(code)
    again.send({ t: 'join', token: playerToken('ann') })
    expect(await again.next()).toEqual({ t: 'joined', peer: players[0]?.peer, host: true })
    expect(await players[0]?.line.closed).toBe(CLOSED.replaced)
    // One player all along, as far as the host is told.
    expect(await host.quiet()).toBe(true)
  })

  it('lets nobody into a code no session has', async () => {
    const stray = await connect(newRoom())
    stray.send({ t: 'join', token: playerToken('ann') })
    expect(await stray.closed).toBe(CLOSED.noRoom)
  })

  it('ends when the host says so: everyone is let go, and the code can be claimed afresh', async () => {
    const { code, host, players } = await session('ann')
    host.send({ t: 'end' })
    expect(await players[0]?.line.closed).toBe(CLOSED.ended)
    expect(await host.closed).toBe(CLOSED.ended)

    const other = await connect(code)
    other.send({ t: 'host', secret: 'another-secret-0123456789abcdef' })
    expect(await other.next()).toEqual({ t: 'hosting', peers: [] })
  })

  it('lets only the host end it', async () => {
    const { players } = await session('ann')
    players[0]?.line.send({ t: 'end' })
    expect(await players[0]?.line.closed).toBe(1008)
  })
})

describe('a room’s day', () => {
  it('ends the room once it runs out with the host away', async () => {
    const { code, host, players } = await session('ann')
    host.close()
    expect(await players[0]?.line.next()).toEqual({ t: 'host', present: false })

    expect(await runDurableObjectAlarm(env.ROOM.get(env.ROOM.idFromName(code)))).toBe(true)
    expect(await players[0]?.line.closed).toBe(CLOSED.ended)
    // The code means nothing any more.
    const late = await connect(code)
    late.send({ t: 'join', token: playerToken('bob') })
    expect(await late.closed).toBe(CLOSED.noRoom)
  })

  it('starts over when it runs out with the host there', async () => {
    const { code, host, players } = await session('ann')
    expect(await runDurableObjectAlarm(env.ROOM.get(env.ROOM.idFromName(code)))).toBe(true)
    players[0]?.line.send({ t: 'send', body: 'still here' })
    expect(await host.next()).toMatchObject({ t: 'msg', body: 'still here' })
  })
})

describe('what the relay will not take', () => {
  it('closes on a frame made for another version', async () => {
    const line = await connect(newRoom())
    line.raw(JSON.stringify({ v: 99, t: 'host', secret: HOST_SECRET }))
    expect(await line.closed).toBe(CLOSED.version)
  })

  it('closes on what is no frame, on a frame too long, and on a message from someone who has not said who they are', async () => {
    const garbage = await connect(newRoom())
    garbage.raw('{"v":1,"t":"dance"}')
    expect(await garbage.closed).toBe(1007)

    const long = await connect(newRoom())
    long.raw('x'.repeat(MAX_FRAME_LENGTH + 1))
    expect(await long.closed).toBe(1009)

    const stranger = await connect(newRoom())
    stranger.send({ t: 'send', body: 'hello' })
    expect(await stranger.closed).toBe(1008)
  })

  it('closes a connection that floods it', async () => {
    const { players } = await session('ann')
    for (let frame = 0; frame < FRAMES_PER_SECOND_MAX * 3; frame++) players[0]?.line.send({ t: 'send', body: frame })
    expect(await players[0]?.line.closed).toBe(1008)
  })
})
