/**
 * Why a change asked of a sheet was not made, in words. The game master's
 * side answers with a word of the rules (src/domain); several of them are
 * told with the same sentence, and one this app does not know with a plain
 * "this could not be done".
 */
import type { Messages } from '../../i18n/en.ts'

type Sentence = keyof Messages['progress']['refused']

const SAID_AS: Readonly<Record<string, Sentence>> = {
  'fight-on': 'fight-on',
  'not-resting': 'not-resting',
  'no-effect': 'no-effect',
  'no-item': 'no-item',
  'bag-closed': 'bag-closed',
  'bag-full': 'bag-full',
  'user-down': 'down',
  'taker-down': 'down',
  down: 'down',
  dead: 'dead',
  invalid: 'invalid',
}

export function refusalWords(text: Messages['progress']['refused'], refused: string): string {
  return text[SAID_AS[refused] ?? 'other']
}
