import { use } from 'react'
import { loadDataPack } from './pack'
import type { DataPack } from './types'

/** The game data, for a component under a Suspense boundary: it waits there while the data loads. */
export function usePack(): DataPack {
  return use(loadDataPack())
}
