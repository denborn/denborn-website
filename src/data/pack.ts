/**
 * Loads the game data pack: species, moves, Abilities, items and their names
 * in both languages. It is a file of its own, fetched once on demand and kept
 * for offline use like the rest of the app.
 */
import packUrl from './generated/pack.json?url'
import type { DataPack } from './types'

let loading: Promise<DataPack> | undefined

export function loadDataPack(): Promise<DataPack> {
  loading ??= fetch(packUrl).then(async (response) => {
    if (!response.ok) throw new Error(`The game data could not be loaded (${response.status})`)
    const pack = (await response.json()) as Partial<DataPack>
    if (typeof pack.version !== 'string' || !pack.species || !pack.moves) throw new Error('The game data file is not a data pack')
    return pack as DataPack
  })
  // A failed load can be tried again.
  loading.catch(() => {
    loading = undefined
  })
  return loading
}
