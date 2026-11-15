import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { MoveChoice } from '../../battle/contract'
import type { Choice } from './fight'

export interface Wording {
  pack: DataPack
  language: Language
  messages: Messages
  /** The name a Pokémon on the field goes by. */
  nameOf: (id: string) => string
}

/** A move's name; Struggle has one even when the game data lists no such move. */
export function moveName(id: string, { pack, language, messages }: Wording): string {
  return pack.moves[id]?.name[language] ?? (id === 'struggle' ? messages.battle.choosing.struggle : id)
}

/** A move with whom it is aimed at, such as "Tackle on Onix". */
export function moveWords(choice: MoveChoice, wording: Wording): string {
  const text = wording.messages.battle.choosing.action
  const name = moveName(choice.move, wording)
  return choice.target ? text.moveOn(name, wording.nameOf(choice.target)) : text.move(name)
}

/** What a Pokémon was given to do this round, in a few words (decision 146). */
export function choiceWords(choice: Choice, wording: Wording): string {
  const text = wording.messages.battle.choosing
  switch (choice.do) {
    case 'wait':
      return text.action.wait
    case 'struggle':
      return text.struggle
    case 'bag':
      return text.action.bag(wording.pack.items[choice.item]?.name[wording.language] ?? choice.item, wording.nameOf(choice.target))
    case 'move':
      return moveWords(choice, wording)
  }
}
