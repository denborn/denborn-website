/**
 * The title screen shows once each time the app starts (decision 205): on a
 * visit that opens on the home, until one tap, or until the home is left some
 * other way. A visit that opens anywhere else, or on a link that carries a
 * code, never shows it.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import { incomingKind } from './incoming-link'

/** Whether a visit that opens at this address starts on the title screen. `hash` is the address's part from its "#". */
export function opensOnTitle(pathname: string, hash: string): boolean {
  return pathname === '/' && incomingKind(hash.slice(1)) === undefined
}

export interface TitleGate {
  showing: () => boolean
  /** The title is passed, for the rest of the visit. */
  pass: () => void
  subscribe: (listener: () => void) => () => void
}

export function createTitleGate(shows: boolean): TitleGate {
  let showing = shows
  const listeners = new Set<() => void>()
  return {
    showing: () => showing,
    pass: () => {
      if (!showing) return
      showing = false
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** From the app's shell, which reads the address the visit opened on, to the home. Without a shell, no title. */
export const TitleGateContext = createContext<TitleGate>(createTitleGate(false))

/** Whether the title shows now, and what passes it. */
export function useTitleGate(): { showing: boolean; pass: () => void } {
  const gate = useContext(TitleGateContext)
  return { showing: useSyncExternalStore(gate.subscribe, gate.showing), pass: gate.pass }
}
