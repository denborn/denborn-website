import { DurableObject } from 'cloudflare:workers'

/**
 * One live session room.
 *
 * MILESTONE 0 SCOPE: this class only proves that a SQLite-backed Durable Object
 * with hibernating WebSockets deploys and runs on Cloudflare Free. It echoes text
 * frames back to the sender. The real relay (GM claim, player approval, routing,
 * limits) replaces the body of this class in milestone 5.
 *
 * It never stores game data: the GM's browser is the only authority.
 */
export class Room extends DurableObject<Env> {
  override fetch(request: Request): Response {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 })
    }
    const pair = new WebSocketPair()
    // Hibernation API: the object can be evicted from memory while sockets stay open.
    this.ctx.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  override webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (typeof message !== 'string' || message.length > MAX_ECHO_LENGTH) {
      ws.close(1009, 'Unsupported frame')
      return
    }
    ws.send(message)
  }

  override webSocketClose(ws: WebSocket, code: number): void {
    // 1005 and 1006 are reserved and cannot be sent back.
    ws.close(code === 1005 || code === 1006 ? 1000 : code)
  }
}

const MAX_ECHO_LENGTH = 1024
