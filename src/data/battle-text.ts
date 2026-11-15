/**
 * The games' own battle messages in both languages (decision 154), as the
 * build read them from the pinned source: a file of its own beside the data
 * pack, fetched when a fight first needs it and kept for offline use like the
 * rest of the app.
 */
import battleTextUrl from './generated/battle-text.json?url'

export interface BattleText {
  /** The version of the source the messages were read at. */
  source: string
  /** Each message by our name for it, as a sentence with named gaps: `{pokemon0}`, `{move}`, `{de}` (features/battle/round-script.ts fills them). */
  messages: Record<string, { en: string; fr: string }>
  /** What can be in effect during a fight, by the engine's id: the games' name for it, and what they say it does. */
  states: Record<string, { name: { en: string; fr: string }; text: { en: string; fr: string } }>
  /** The gender and number of each held item's French name (m, f, mp, fp), for the articles of the French sentences. */
  itemGrammar: Record<string, string>
}

let loading: Promise<BattleText> | undefined

export function loadBattleText(): Promise<BattleText> {
  loading ??= fetch(battleTextUrl).then(async (response) => {
    if (!response.ok) throw new Error(`The battle messages could not be loaded (${response.status})`)
    const text = (await response.json()) as Partial<BattleText>
    if (typeof text.source !== 'string' || !text.messages || !text.states || !text.itemGrammar) throw new Error('The battle messages file is not what the build makes')
    return text as BattleText
  })
  // A failed load can be tried again.
  loading.catch(() => {
    loading = undefined
  })
  return loading
}
