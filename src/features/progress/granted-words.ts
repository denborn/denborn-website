/**
 * What the game master gave a character or took from it by hand (decisions 5
 * and 170), as sentences: one for what was given, one for what was taken, one
 * for a level reached.
 */
import type { Messages } from '../../i18n/en.ts'
import type { Granted } from '../../shared/protocol/session.ts'

export function grantedSentences(granted: Granted, name: string, itemName: (id: string) => string, messages: Messages): string[] {
  const text = messages.progress.granted
  const stack = (item: string, quantity: number): string => messages.sheet.stack(itemName(item), quantity)
  const given = [
    ...(granted.exp > 0 ? [text.exp(granted.exp)] : []),
    ...(granted.money > 0 ? [text.money(granted.money)] : []),
    ...granted.items.filter(({ quantity }) => quantity > 0).map(({ item, quantity }) => stack(item, quantity)),
  ]
  const taken = [...(granted.money < 0 ? [text.money(-granted.money)] : []), ...granted.items.filter(({ quantity }) => quantity < 0).map(({ item, quantity }) => stack(item, -quantity))]
  return [
    ...(given.length > 0 ? [text.gave(name, given.join(', '))] : []),
    ...(taken.length > 0 ? [text.took(name, taken.join(', '))] : []),
    ...(granted.level ? [messages.session.join.levelUp(name, granted.level.to)] : []),
  ]
}
