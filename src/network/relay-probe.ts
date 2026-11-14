import { makeRoomCode } from '../shared/protocol/room-code'

const PROBE_TIMEOUT_MS = 5000

/**
 * Opens a throwaway room on the relay, sends one frame and waits for it to come
 * back. Resolves with the round-trip time in milliseconds, or rejects.
 *
 * It tells a GM or player whether live play can work from this network before a
 * session starts. It carries no game data.
 */
export function probeRelay(origin: string = location.origin): Promise<number> {
  const code = makeRoomCode(crypto.getRandomValues(new Uint8Array(5)))
  const url = new URL(`/ws/${code}`, origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const nonce = `probe:${crypto.randomUUID()}`

  return new Promise<number>((resolve, reject) => {
    const socket = new WebSocket(url)
    const startedAt = performance.now()
    let settled = false

    const finish = (outcome: number | Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.close()
      if (typeof outcome === 'number') resolve(outcome)
      else reject(outcome)
    }

    const timer = setTimeout(() => finish(new Error('Relay probe timed out')), PROBE_TIMEOUT_MS)

    socket.addEventListener('open', () => socket.send(nonce))
    socket.addEventListener('message', (event) => {
      if (event.data === nonce) finish(Math.round(performance.now() - startedAt))
    })
    socket.addEventListener('error', () => finish(new Error('Relay connection failed')))
    socket.addEventListener('close', () => finish(new Error('Relay closed the connection')))
  })
}
