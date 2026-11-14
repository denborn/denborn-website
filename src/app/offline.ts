import { createContext, useContext } from 'react'
import type { OfflineState } from '../pwa/use-offline-status'

/**
 * Whether the app has finished caching itself, from the one place that
 * registers the service worker (the app's shell) to the screens that show it.
 */
export const OfflineContext = createContext<OfflineState>({ status: 'unsupported', updateAvailable: false, applyUpdate: () => undefined })

export function useOffline(): OfflineState {
  return useContext(OfflineContext)
}
