import { DurableObject } from 'cloudflare:workers'
import {
  CLOSED,
  type ClientFrame,
  FRAMES_PER_SECOND_MAX,
  MAX_FRAME_LENGTH,
  PROBE_LENGTH_MAX,
  PROBE_PREFIX,
  ROOM_LIFETIME_MS,
  ROOM_SOCKETS_MAX,
  type RelayFrame,
  decodeClientFrame,
  encodeFrame,
} from '../src/shared/protocol/relay'

/** What the relay remembers of a connection: nothing until it says who it is. */
type Who = { role: 'host' } | { role: 'player'; peer: string }

/** Where the hash of the host's secret is kept: the one thing a room stores. */
const HOST_KEY = 'host'

/** The peer id of a player: the first sixteen hex digits of their token's hash. The token itself goes no further than the relay. */
const PEER_ID_LENGTH = 16

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * One live session's room: a switchboard between the game master's browser
 * (the host) and the players' (see src/shared/protocol/relay.ts).
 *
 * It passes messages on and says who is there. It never reads a message's
 * body and stores no game data: the host's browser is the only authority.
 * The one thing it keeps is the hash of the host's secret, so that the room
 * stays the host's across a dropped connection, for a day (decision 122).
 *
 * WebSockets hibernate: the object may leave memory while they stay open, so
 * what it knows of a connection travels with the connection itself.
 */
export class Room extends DurableObject<Env> {
  /** Frames each connection sent in the current second. Lost when the object sleeps, which only resets the count. */
  private readonly sent = new Map<WebSocket, { second: number; frames: number }>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Answered without waking the object: a browser can tell a dead connection from a quiet one for free.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  override fetch(request: Request): Response {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket upgrade', { status: 426 })
    if (this.ctx.getWebSockets().length >= ROOM_SOCKETS_MAX) return new Response('Room full', { status: 503 })
    const pair = new WebSocketPair()
    this.ctx.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  override async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string' || message.length > MAX_FRAME_LENGTH) {
      socket.close(1009, 'Frame too large')
      return
    }
    if (this.isFlooding(socket)) {
      socket.close(1008, 'Too many frames')
      return
    }
    const who = whoIs(socket)
    if (!who && message.startsWith(PROBE_PREFIX)) {
      if (message.length <= PROBE_LENGTH_MAX) socket.send(message)
      return
    }
    const decoded = decodeClientFrame(message)
    if (!decoded.ok) {
      if (decoded.reason === 'version') socket.close(CLOSED.version, 'Another version of the relay')
      else socket.close(1007, 'Not a relay frame')
      return
    }
    await this.handle(socket, who, decoded.frame)
  }

  private async handle(socket: WebSocket, who: Who | undefined, frame: ClientFrame): Promise<void> {
    switch (frame.t) {
      case 'host':
        await this.host(socket, frame.secret)
        return
      case 'join':
        await this.join(socket, frame.token)
        return
      case 'send':
        if (who?.role === 'host') {
          for (const peer of frame.to ?? []) send(this.player(peer), { t: 'msg', body: frame.body })
        } else if (who?.role === 'player') {
          const host = this.hostSocket()
          if (host) send(host, { t: 'msg', from: who.peer, body: frame.body })
          // Nobody to pass it to: the player is told, and sends again when the host is back.
          else send(socket, { t: 'host', present: false })
        } else {
          socket.close(1008, 'Say who you are first')
        }
        return
      case 'end':
        if (who?.role === 'host') await this.end()
        else socket.close(1008, 'Only the host ends a session')
        return
    }
  }

  /** Claims the room for the first secret it hears, and gives it back to that secret only. */
  private async host(socket: WebSocket, secret: string): Promise<void> {
    const hash = await sha256(secret)
    const claimedBy = await this.ctx.storage.get<string>(HOST_KEY)
    if (claimedBy !== undefined && claimedBy !== hash) {
      socket.close(CLOSED.notHost, 'Not the host of this room')
      return
    }
    if (claimedBy === undefined) await this.ctx.storage.put(HOST_KEY, hash)
    // The room's day starts again each time its host connects.
    await this.ctx.storage.setAlarm(Date.now() + ROOM_LIFETIME_MS)
    const before = this.hostSocket()
    if (before && before !== socket) this.replace(before)
    socket.serializeAttachment({ role: 'host' } satisfies Who)
    send(socket, { t: 'hosting', peers: this.players().map(([, peer]) => peer) })
    if (!before) for (const [player] of this.players()) send(player, { t: 'host', present: true })
  }

  private async join(socket: WebSocket, token: string): Promise<void> {
    if ((await this.ctx.storage.get<string>(HOST_KEY)) === undefined) {
      socket.close(CLOSED.noRoom, 'No session has this code')
      return
    }
    const peer = (await sha256(token)).slice(0, PEER_ID_LENGTH)
    const before = this.player(peer)
    if (before && before !== socket) this.replace(before)
    socket.serializeAttachment({ role: 'player', peer } satisfies Who)
    const host = this.hostSocket()
    send(socket, { t: 'joined', peer, host: host !== undefined })
    if (!before) send(host, { t: 'peer', peer, present: true })
  }

  /** Ends the session: everyone is let go and the room forgets its host, so the code means nothing any more. */
  private async end(): Promise<void> {
    for (const socket of this.ctx.getWebSockets()) {
      socket.serializeAttachment(null)
      socket.close(CLOSED.ended, 'The session ended')
    }
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  /** The room's day ran out. With its host connected it gets another; otherwise it ends. */
  override async alarm(): Promise<void> {
    if (this.hostSocket()) await this.ctx.storage.setAlarm(Date.now() + ROOM_LIFETIME_MS)
    else await this.end()
  }

  override webSocketClose(socket: WebSocket, code: number): void {
    this.left(socket)
    // 1005 and 1006 are reserved and cannot be sent back.
    socket.close(code === 1005 || code === 1006 ? 1000 : code)
  }

  override webSocketError(socket: WebSocket): void {
    this.left(socket)
  }

  /** Tells the other side that a connection is gone. */
  private left(socket: WebSocket): void {
    const who = whoIs(socket)
    this.sent.delete(socket)
    // Forgotten at once, so that it is not announced twice nor counted among those still there.
    socket.serializeAttachment(null)
    if (who?.role === 'host') for (const [player] of this.players()) send(player, { t: 'host', present: false })
    if (who?.role === 'player') send(this.hostSocket(), { t: 'peer', peer: who.peer, present: false })
  }

  /** Closes a connection that a newer one of the same host or player takes the place of, without announcing a departure. */
  private replace(socket: WebSocket): void {
    socket.serializeAttachment(null)
    socket.close(CLOSED.replaced, 'Connected again elsewhere')
  }

  private hostSocket(): WebSocket | undefined {
    return this.ctx.getWebSockets().find((socket) => whoIs(socket)?.role === 'host')
  }

  private players(): [WebSocket, string][] {
    return this.ctx.getWebSockets().flatMap((socket): [WebSocket, string][] => {
      const who = whoIs(socket)
      return who?.role === 'player' ? [[socket, who.peer]] : []
    })
  }

  private player(peer: string): WebSocket | undefined {
    return this.players().find(([, id]) => id === peer)?.[0]
  }

  private isFlooding(socket: WebSocket): boolean {
    const second = Math.floor(Date.now() / 1000)
    const count = this.sent.get(socket)
    if (count?.second !== second) {
      this.sent.set(socket, { second, frames: 1 })
      return false
    }
    count.frames++
    return count.frames > FRAMES_PER_SECOND_MAX
  }
}

function whoIs(socket: WebSocket): Who | undefined {
  return (socket.deserializeAttachment() as Who | null) ?? undefined
}

/** Sends a frame to a connection, if there is one and it is still open. */
function send(socket: WebSocket | undefined, frame: RelayFrame): void {
  if (!socket) return
  try {
    socket.send(encodeFrame(frame))
  } catch {
    // Closing or closed since it was looked up: its departure is announced by the close handler.
  }
}
