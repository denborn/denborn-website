/**
 * How a document coming in stands against the copy this device keeps under
 * the same id (decision 107, and 117 for campaigns): there is none (`new`),
 * they are alike (`same`), one was saved after the other (`newer`, `older`:
 * the one coming in), they were changed apart (`differs`), or the kept one
 * cannot be read (`unreadable`).
 */
import type { Stored } from '../../storage/library.ts'

export type Standing = 'new' | 'same' | 'newer' | 'older' | 'differs' | 'unreadable'

export function standingOf<T extends { revision: number }>(incoming: T, entry: Stored<T> | undefined, alike: (one: T, other: T) => boolean): Standing {
  if (!entry) return 'new'
  if (!entry.read.ok) return 'unreadable'
  const kept = entry.read.value
  if (alike(kept, incoming)) return 'same'
  if (incoming.revision > kept.revision) return 'newer'
  if (incoming.revision < kept.revision) return 'older'
  return 'differs'
}
