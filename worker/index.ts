import { isValidRoomCode } from '../src/shared/protocol/room-code'

export { Room } from './room'

const ROOM_PATH = /^\/ws\/([^/]+)$/

export default {
  fetch(request, env): Response | Promise<Response> {
    const url = new URL(request.url)
    const match = ROOM_PATH.exec(url.pathname)
    const code = match?.[1]
    // Reject before any Durable Object is addressed, so junk codes cost nothing.
    if (code === undefined || !isValidRoomCode(code)) {
      return new Response('Unknown room', { status: 404 })
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }
    if (!isSameOrigin(request, url)) {
      return new Response('Forbidden origin', { status: 403 })
    }
    return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request)
  },
} satisfies ExportedHandler<Env>

/** Browsers always send Origin on a WebSocket handshake; only our own pages may connect. */
function isSameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('Origin')
  if (origin === null) return false
  try {
    return new URL(origin).host === url.host
  } catch {
    return false
  }
}
