/**
 * The battle sprites as the browser keeps them for offline use: a cache of
 * their own, which the page fills in the background (sprite-warmup.ts) and
 * the service worker serves from (vite.config.ts, the route for sprites).
 * Its name carries the version of the artwork: other artwork is another
 * cache, and the old one is dropped.
 */
import type { SpriteStore } from './sprite-warmup'

const PREFIX = 'denborn-sprites-'
/** The same name the service worker's route is given at build time. */
const NAME = `${PREFIX}${__SPRITES_VERSION__}`
/** How long one sprite may take before it is left for the next try. */
const FETCH_TIMEOUT_MS = 20_000

/** The browser's store of sprites; nothing when the browser has no cache to offer (it then has no service worker either). */
export function browserSpriteStore(): SpriteStore | undefined {
  if (!('caches' in globalThis)) return undefined
  return {
    kept: async () => (await (await caches.open(NAME)).keys()).map((request) => new URL(request.url).pathname),
    keep: async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      if (!response.ok) throw new Error(`${url} answered ${response.status}`)
      await (await caches.open(NAME)).put(url, response)
    },
  }
}

/** Drops the sprites kept for earlier artwork. */
export async function dropOlderSprites(): Promise<void> {
  const names = await caches.keys()
  await Promise.all(names.filter((name) => name.startsWith(PREFIX) && name !== NAME).map((name) => caches.delete(name)))
}
