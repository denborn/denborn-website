import type { DataPack } from '../../data/types'
import { STAT_IDS, type StatId } from '../../game-rules/stats'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { MoveChoice } from '../../battle/contract'
import type { BattleText } from '../../data/battle-text'
import type { EffectWords } from './effects'
import type { Choice } from './fight'
import type { Telling } from './round-script'

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

const isStat = (stat: string): stat is StatId => STAT_IDS.some((id) => id === stat)

/** The words the list of what is in effect is written with. */
export function effectWords(wording: Wording, battleText: BattleText): EffectWords {
  const field = wording.messages.battle.field
  return {
    language: wording.language,
    states: battleText.states,
    own: field.ownEffects,
    statName: (stat) => (stat === 'accuracy' ? field.accuracy : stat === 'evasion' ? field.evasion : isStat(stat) ? wording.pack.statNames[stat][wording.language] : stat),
    turnsLeft: field.turnsLeft,
    scope: field.scope,
    slot: field.slot,
  }
}

/** How a round's steps are put into words: the games' own sentences, Denborn's own for what the games do not have (decisions 86 and 154). */
export function tellingOf(wording: Wording, battleText: BattleText): Telling {
  const own = wording.messages.battle.messages
  return {
    official: (key) => battleText.messages[key]?.[wording.language],
    own: {
      downed: own.downed,
      agonizing: own.agonizing,
      hitWhileDown: own.hitWhileDown,
      died: own.died,
      revived: own.revived,
      bagUsed: (user = '', target = '', item = '') => own.bagUsed(user, item, target),
      bagBlocked: own.bagBlocked,
      bagNoEffect: own.bagNoEffect,
      waited: own.waited,
    },
    nameOf: wording.nameOf,
    moveName: (id) => moveName(id, wording),
    itemName: (id) => wording.pack.items[id]?.name[wording.language] ?? id,
    abilityName: (id) => wording.pack.abilities[id]?.name[wording.language] ?? id,
    typeName: (id) => wording.pack.types[id]?.name[wording.language] ?? id,
    itemGrammar: (id) => battleText.itemGrammar[id],
  }
}
