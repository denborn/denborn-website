import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export type OfflineStatus = 'unsupported' | 'preparing' | 'ready'

export interface OfflineState {
  status: OfflineStatus
  /** A newer app version has been downloaded and is waiting for the user's go-ahead. */
  updateAvailable: boolean
  /** Activates the waiting version and reloads. Never call it during a battle. */
  applyUpdate: () => void
}

const SUPPORTED = 'serviceWorker' in navigator

/**
 * Tracks whether the app has finished caching itself for offline use.
 *
 * "ready" means a service worker is active for this page, so everything in the
 * precache has been stored: the offline guarantee is only shown once it is true.
 */
export function useOfflineStatus(): OfflineState {
  const [active, setActive] = useState(false)
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

  return {
    status: !SUPPORTED ? 'unsupported' : active ? 'ready' : 'preparing',
    updateAvailable,
    applyUpdate: () => void updateServiceWorker(true),
  }
}
