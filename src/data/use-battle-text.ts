import { use } from 'react'
import { type BattleText, loadBattleText } from './battle-text'

/** The games' battle messages, for a component under a Suspense boundary: it waits there while they load. */
export function useBattleText(): BattleText {
  return use(loadBattleText())
}
