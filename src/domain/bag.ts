/**
 * What a Bag holds: one stack per item, from 1 to 999 of it (the saved form's
 * own limits, shared/schema/common.ts).
 */
import type { ItemStack } from '../shared/schema/common.ts'

export const STACK_MAX = 999
/** The most stacks the saved form of a Bag takes. */
export const STACKS_MAX = 500

export function countOf(bag: readonly ItemStack[], item: string): number {
  return bag.find((stack) => stack.item === item)?.quantity ?? 0
}

/** The Bag with more of an item; nothing when it cannot hold that many. */
export function withMore(bag: readonly ItemStack[], item: string, quantity: number): ItemStack[] | undefined {
  const held = countOf(bag, item)
  if (held + quantity > STACK_MAX || (held === 0 && bag.length >= STACKS_MAX)) return undefined
  return held === 0 ? [...bag, { item, quantity }] : bag.map((stack) => (stack.item === item ? { ...stack, quantity: held + quantity } : stack))
}

/** The Bag with fewer of an item, its stack gone with its last one; nothing when it does not hold that many. */
export function withFewer(bag: readonly ItemStack[], item: string, quantity: number): ItemStack[] | undefined {
  const held = countOf(bag, item)
  if (held < quantity) return undefined
  return bag.flatMap((stack) => (stack.item !== item ? [stack] : held > quantity ? [{ ...stack, quantity: held - quantity }] : []))
}
