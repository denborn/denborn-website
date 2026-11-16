/**
 * What the game master gives or takes by hand (decisions 5 and 170): items,
 * Pokédollars and EXP, at any time during a session, to any character. EXP
 * is only ever added, and the level follows it at once (decision 161).
 */
import type { DataPack } from '../data/types.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { ItemStack } from '../shared/schema/common.ts'
import { MONEY_MAX, awarded } from './after-fight.ts'
import { withFewer, withMore } from './bag.ts'
import type { Changed } from './changed.ts'

export interface Grant {
  /** Items added to the character's Bag (a quantity above 0) or taken from it (below 0). */
  items?: readonly { item: string; quantity: number }[]
  /** Pokédollars added (above 0) or taken (below 0). */
  money?: number
  /** EXP added. */
  exp?: number
}

export type GrantProblem =
  | 'unknown-item'
  /** The character's Bag does not hold as many as are taken. */
  | 'not-enough'
  | 'bag-full'
  /** More Pokédollars taken than the character has, or more given than a sheet holds. */
  | 'money'
  /** EXP is only added. */
  | 'exp'
  | 'nothing'

export function granted(character: CharacterDocument, grant: Grant, pack: DataPack): Changed<GrantProblem> {
  const items = grant.items ?? []
  const money = grant.money ?? 0
  const exp = grant.exp ?? 0
  if (!Number.isInteger(exp) || exp < 0) return { ok: false, problem: 'exp' }
  const purse = character.money + money
  if (!Number.isInteger(money) || purse < 0 || purse > MONEY_MAX) return { ok: false, problem: 'money' }

  let bag: readonly ItemStack[] = character.bag
  for (const { item, quantity } of items) {
    if (!(item in pack.items) || !Number.isInteger(quantity)) return { ok: false, problem: 'unknown-item' }
    const next = quantity > 0 ? withMore(bag, item, quantity) : quantity < 0 ? withFewer(bag, item, -quantity) : bag
    if (!next) return { ok: false, problem: quantity > 0 ? 'bag-full' : 'not-enough' }
    bag = next
  }
  if (exp === 0 && money === 0 && items.every(({ quantity }) => quantity === 0)) return { ok: false, problem: 'nothing' }
  // The EXP is awarded as after a fight: the level, the stats and the HP follow it.
  return { ok: true, character: { ...awarded(character, exp, 0, pack), money: purse, bag: [...bag] } }
}
