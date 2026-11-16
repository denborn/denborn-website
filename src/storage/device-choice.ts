/**
 * A choice of the device, made in the Options: the language, the speed of a
 * fight's text. It is read once from what the browser keeps, kept again at
 * each change, and told to whoever shows it.
 *
 * The browser's storage can be refused (private mode, site data disabled):
 * the choice then lasts for the visit, and nothing is said.
 */
import type { KeyValue } from './library.ts'

type Kept = Pick<KeyValue, 'getItem' | 'setItem'>

export interface DeviceChoice<Choice extends string> {
  get: () => Choice
  /** Changes the choice, keeps it and tells those who listen. The choice it already is changes nothing. */
  set: (choice: Choice) => void
  /** Calls `listener` at each change; returns what stops it. */
  subscribe: (listener: () => void) => () => void
}

/**
 * The choice kept under `key`. `pick` reads what was kept, or `null` when
 * nothing was, and answers with the choice to start from. `storage` is asked
 * for at each use, since a browser may refuse the very mention of its own.
 */
export function createDeviceChoice<Choice extends string>(key: string, pick: (stored: string | null) => Choice, storage: () => Kept = () => localStorage): DeviceChoice<Choice> {
  const listeners = new Set<() => void>()

  function readStored(): string | null {
    try {
      return storage().getItem(key)
    } catch {
      return null
    }
  }

  let current = pick(readStored())
  return {
    get: () => current,
    set: (choice) => {
      if (choice === current) return
      current = choice
      try {
        storage().setItem(key, choice)
      } catch {
        // Refused: see the note at the top.
      }
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
