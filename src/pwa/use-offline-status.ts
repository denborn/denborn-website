import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { loadDataPack } from '../data/pack'
import { battleSpriteUrls } from '../data/sprites'
import { browserSpriteStore, dropOlderSprites } from './sprite-cache'
import { type KeptSprites, keepSprites } from './sprite-keeper'

/**
 * How far the app is from working offline (decision 181). `preparing`: the
 * app itself is being kept. `sprites`: the app works offline, and the battle
 * sprites are being fetched in the background. `ready`: everything is kept.
 */
export type OfflineStatus = 'unsupported' | 'preparing' | 'sprites' | 'ready'

export interface OfflineState {
  status: OfflineStatus
  /** While the sprites are being fetched: how many are kept, and whether the fetching stopped for want of a network. */
  sprites?: KeptSprites
  /** A newer app version has been downloaded and is waiting for the user's go-ahead. */
  updateAvailable: boolean
  /** Activates the waiting version and reloads. Never call it during a battle. */
  applyUpdate: () => void
}

const SUPPORTED = 'serviceWorker' in navigator
/** Where the sprites are kept; nothing in a browser with no cache to offer, where the first stage is all there is. */
const store = browserSpriteStore()
/** How many sprites are fetched at the same time: a browser opens about six connections to a site. */
const AT_ONCE = 6
/** Failures in a row after which the network is taken for gone. */
const GIVE_UP_AFTER = 5
/** How many times at most the sprites still missing are gone through before waiting for the network to come back. */
const PASSES = 3
/** The count on screen moves every few sprites, not at each one. */
const TOLD_EVERY = 8
/** After a try that brought nothing in while the device says it has a network: the waits before the next ones. */
const RETRY_AFTER_MS = [3_000, 10_000, 30_000, 120_000]

/**
 * Tracks whether the app has finished keeping itself for offline use, in its
 * two stages.
 *
 * The first is the service worker's: once one is active for this page,
 * everything in its precache has been stored. The second is the page's: it
 * then fetches the battle sprites into their own cache, and tries again when
 * the network comes back.
 */
export function useOfflineStatus(): OfflineState {
  const [active, setActive] = useState(false)
  const [sprites, setSprites] = useState<KeptSprites>()
  const {
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!SUPPORTED) return
    let cancelled = false
    void navigator.serviceWorker.ready.then(() => {
      if (!cancelled) setActive(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!active || !store) return
    const keeper = keepSprites({
      urls: async () => battleSpriteUrls(Object.values((await loadDataPack()).species)),
      store,
      online: () => navigator.onLine,
      retryAfter: RETRY_AFTER_MS,
      later: (run, ms) => {
        const timer = setTimeout(run, ms)
        return () => clearTimeout(timer)
      },
      onState: setSprites,
      onComplete: () => void dropOlderSprites(),
      atOnce: AT_ONCE,
      giveUpAfter: GIVE_UP_AFTER,
      passes: PASSES,
      toldEvery: TOLD_EVERY,
    })
    // What a lost network left unfetched is fetched when it comes back.
    window.addEventListener('online', keeper.networkBack)
    return () => {
      keeper.stop()
      window.removeEventListener('online', keeper.networkBack)
    }
  }, [active])

  // Between the first stage's end and the first count of sprites, a moment, it is still getting ready.
  const counted = store === undefined ? { done: 0, of: 0, stalled: false } : sprites
  const fetching = counted !== undefined && (counted.done < counted.of || counted.stalled)
  return {
    status: !SUPPORTED ? 'unsupported' : !active || !counted ? 'preparing' : fetching ? 'sprites' : 'ready',
    ...(counted && fetching ? { sprites: counted } : {}),
    updateAvailable,
    applyUpdate: () => void updateServiceWorker(true),
  }
}
