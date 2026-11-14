import { listDurableObjectIds } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { makeRoomCode } from '../../src/shared/protocol/room-code'

const ORIGIN = 'https://denborn.test'
const CODE = makeRoomCode(new Uint8Array([7, 42, 99, 150, 201]))

function upgrade(code: string, headers: Record<string, string> = {}): Promise<Response> {
  return exports.default.fetch(
    new Request(`${ORIGIN}/ws/${code}`, { headers: { Upgrade: 'websocket', Origin: ORIGIN, ...headers } }),
  )
}

describe('relay routing', () => {
  it('accepts a WebSocket on a valid room and returns frames through the Durable Object', async () => {
    const response = await upgrade(CODE)
    expect(response.status).toBe(101)

    const socket = response.webSocket
    if (socket === null) throw new Error('No WebSocket on the upgrade response')
    socket.accept()
    const reply = new Promise<unknown>((resolve) => {
      socket.addEventListener('message', (event) => resolve(event.data), { once: true })
    })
    socket.send('hello')
    expect(await reply).toBe('hello')
    socket.close(1000)
  })

  it('refuses a mistyped code without creating a Durable Object', async () => {
    const before = (await listDurableObjectIds(env.ROOM)).length
    const lastSymbol = CODE.slice(-1) === '2' ? '3' : '2'
    const response = await upgrade(CODE.slice(0, -1) + lastSymbol)

    expect(response.status).toBe(404)
    expect((await listDurableObjectIds(env.ROOM)).length).toBe(before)
  })

  it('refuses a page from another origin', async () => {
    const response = await upgrade(CODE, { Origin: 'https://elsewhere.test' })
    expect(response.status).toBe(403)
  })

  it('refuses a plain HTTP request to a room', async () => {
    const response = await exports.default.fetch(new Request(`${ORIGIN}/ws/${CODE}`))
    expect(response.status).toBe(426)
  })
})
