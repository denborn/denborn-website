/**
 * One browser's line to a session's room on the relay: it says who it is as
 * soon as it is connected, passes on what the relay says, and comes back by
 * itself when the connection drops, a little later each time.
 *
 * It knows nothing of the session: what the frames mean is for the game
 * master's or the player's side of the session to say (src/features/session).
 */
import { CLOSED, type ClientFrame, type RelayFrame, decodeRelayFrame, encodeFrame } from '../shared/protocol/relay.ts'

/** How often the line is checked, after a first check as soon as it is connected, and how long the relay has to answer. The relay answers without waking the room. */
export const PING_EVERY_MS = 20_000
export const PONG_WITHIN_MS = 10_000

/** The wait before coming back after a drop: this long the first time, twice as long each time after, up to the most. */
export const RETRY_FIRST_MS = 1_000
export const RETRY_MOST_MS = 15_000

/** The code this side closes with when the relay stops answering. */
export const CLOSED_SILENT = 4900

/** Codes after which coming back would be pointless: the relay said why this line is over. */
const OVER = new Set<number>([CLOSED.notHost, CLOSED.replaced, CLOSED.noRoom, CLOSED.ended, CLOSED.version])

/** The part of a WebSocket the line uses; a test passes its own. */
export interface SocketLike {
  send(text: string): void
  close(code?: number): void
  onopen: (() => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number }) => void) | null
}

export interface RelayLinkOptions {
  /** The room's address: ws(s)://<site>/ws/<code>. */
  url: string
  /** Who this browser is: the first frame sent on every connection. */
  hello: ClientFrame
  /** Connected, and the hello sent. */
  onUp: () => void
  onFrame: (frame: RelayFrame) => void
  /** Disconnected, with the code; `comingBack` says whether the line will try again by itself. */
  onDown: (code: number, comingBack: boolean) => void
  /** How long the relay took to answer the last check of the line, in milliseconds; nothing once the line is down. */
  onLatency?: (milliseconds: number | undefined) => void
  /** Opens a socket. The browser's own by default. */
  connect?: (url: string) => SocketLike
  /** A number from 0 to 1, to spread the returns of many browsers. */
  random?: () => number
  /** A clock in milliseconds, to time the relay's answers with. The browser's own by default. */
  now?: () => number
}

export interface RelayLink {
  /** Sends a frame. False when the line is down: nothing is kept to send later. */
  send(frame: ClientFrame): boolean
  /** Ends the line for good. Nothing is said to the owner afterwards. */
  close(): void
}

function browserSocket(url: string): SocketLike {
  const socket = new WebSocket(url)
  const like: SocketLike = { send: (text) => socket.send(text), close: (code) => socket.close(code), onopen: null, onmessage: null, onclose: null }
  socket.onopen = () => like.onopen?.()
  socket.onmessage = (event) => like.onmessage?.({ data: event.data })
  socket.onclose = (event) => like.onclose?.({ code: event.code })
  return like
}

export function openRelayLink(options: RelayLinkOptions): RelayLink {
  const connect = options.connect ?? browserSocket
  const random = options.random ?? Math.random
  const now = options.now ?? (() => performance.now())
  let socket: SocketLike | undefined
  let up = false
  let closed = false
  /** Drops in a row since the relay was last heard. */
  let drops = 0
  let retry: ReturnType<typeof setTimeout> | undefined
  let ping: ReturnType<typeof setInterval> | undefined
  let pong: ReturnType<typeof setTimeout> | undefined
  /** When the check that is still unanswered was sent. */
  let checkedAt: number | undefined

  const stopTimers = (): void => {
    clearTimeout(retry)
    clearInterval(ping)
    clearTimeout(pong)
  }

  /** This connection is over: say so, and come back unless the relay said it is pointless. */
  const dropped = (mine: SocketLike, code: number): void => {
    if (socket !== mine || closed) return
    // Deaf to the old socket from here on: a late close event must not count twice.
    mine.onopen = mine.onmessage = mine.onclose = null
    socket = undefined
    up = false
    stopTimers()
    checkedAt = undefined
    const comingBack = !OVER.has(code)
    options.onDown(code, comingBack)
    options.onLatency?.(undefined)
    if (!comingBack) return
    // Half to all of the wait, so that browsers dropped together do not all return together.
    const wait = Math.min(RETRY_MOST_MS, RETRY_FIRST_MS * 2 ** drops) * (0.5 + random() / 2)
    drops++
    retry = setTimeout(open, wait)
  }

  function open(): void {
    const mine = connect(options.url)
    socket = mine
    mine.onopen = () => {
      if (socket !== mine) return
      up = true
      mine.send(encodeFrame(options.hello))
      const check = (): void => {
        mine.send('ping')
        checkedAt = now()
        clearTimeout(pong)
        // No answer: the connection is dead even if the browser has not noticed. Close it and come back.
        pong = setTimeout(() => {
          mine.close(CLOSED_SILENT)
          dropped(mine, CLOSED_SILENT)
        }, PONG_WITHIN_MS)
      }
      // Checked at once, so that how far the relay is is known from the start; then now and then.
      check()
      ping = setInterval(check, PING_EVERY_MS)
      options.onUp()
    }
    mine.onmessage = ({ data }) => {
      if (socket !== mine || typeof data !== 'string') return
      // Anything heard shows the line is alive.
      clearTimeout(pong)
      if (data === 'pong') {
        // The answer to the last check: the time it took is the way there and back.
        if (checkedAt !== undefined) options.onLatency?.(Math.round(now() - checkedAt))
        checkedAt = undefined
        return
      }
      const decoded = decodeRelayFrame(data)
      if (decoded.ok) {
        drops = 0
        options.onFrame(decoded.frame)
      } else if (decoded.reason === 'version') {
        // The relay is of another version than this app: nothing more can be understood.
        mine.close(CLOSED.version)
        dropped(mine, CLOSED.version)
      }
    }
    mine.onclose = ({ code }) => dropped(mine, code)
  }

  open()
  return {
    send: (frame) => {
      if (!up || !socket) return false
      socket.send(encodeFrame(frame))
      return true
    },
    close: () => {
      closed = true
      up = false
      stopTimers()
      socket?.close(1000)
      socket = undefined
    },
  }
}

/** The address of a room on the site a page was served from. */
export function roomUrl(code: string, origin: string): string {
  const url = new URL(`/ws/${code}`, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.href
}
