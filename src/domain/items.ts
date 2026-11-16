/**
 * Items outside a fight (decisions 3, 6, 12, 171 to 173 and 175): a Bag item
 * used on anyone in the party, a PP Up, the item a character holds, and the
 * Bag of a teammate who is downed or dead, open to the others.
 *
 * In a fight the engine applies an item's effect (src/battle/engine/bag.ts);
 * here the same effect is applied to the character's sheet. What only means
 * something in a fight (a stat raised, confusion cured) does nothing here,
 * and an item that does nothing is not used up.
 */
import type { DataPack, ItemData } from '../data/types.ts'
import { PP_UPS_MAX, maxPp } from '../game-rules/pp.ts'
import type { CharacterDocument, MoveSlot } from '../shared/schema/character.ts'
import { countOf, withFewer, withMore } from './bag.ts'
import { type Changed, type PartyChanged, revised } from './changed.ts'
import { maxHpOf } from './character-check.ts'

/** An item used from a Bag, outside a fight. */
export interface ItemUse {
  /** Who uses it: a character on its feet. */
  user: string
  /** The downed or dead teammate whose Bag it comes from; the user's own Bag when left out (decision 175). */
  from?: string | undefined
  item: string
  /** Who it is used on: anyone in the party (decision 12). */
  target: string
  /** The move a PP item or a PP Up is for. */
  move?: string | undefined
}

export type ItemProblem =
  | 'unknown-character'
  /** Only a character on its feet uses an item. */
  | 'user-down'
  /** A teammate's Bag opens to the others only once that teammate is downed or dead. */
  | 'bag-closed'
  | 'no-item'
  /** Nothing in the item does anything for that Pokémon now: it is not used up. */
  | 'no-effect'

const isDown = (character: CharacterDocument): boolean => character.condition.state !== 'standing'

/** Whether an item does anything when used from a Bag outside a fight: a Bag offers to use it only then. */
export function worksOutsideFight(item: ItemData): boolean {
  const effect = item.bag
  return item.ppUps !== undefined || (effect !== undefined && (effect.heal !== undefined || effect.cure !== undefined || effect.revive !== undefined || effect.reviveAll === true || effect.restorePp !== undefined))
}

/** Whether using it asks which move it is for: a PP item for one move, a PP Up. */
export function isForOneMove(item: ItemData): boolean {
  return item.ppUps !== undefined || item.bag?.restorePp?.scope === 'one'
}

/** A character brought back by a revival item, the downed and the dead alike (decision 172). */
function revived(character: CharacterDocument, hp: number): CharacterDocument {
  return { ...character, hp: Math.max(1, hp), condition: { state: 'standing' } }
}

/** A move's PP restored: nothing when it is already full. */
function ppRestored(slot: MoveSlot, amount: number | 'full', pack: DataPack): MoveSlot | undefined {
  const move = pack.moves[slot.id]
  const most = move ? maxPp(move.pp, slot.ppUps, move.fixedPp) : slot.pp
  return slot.pp >= most ? undefined : { ...slot, pp: amount === 'full' ? most : Math.min(most, slot.pp + amount) }
}

/** A move given PP Ups: its most PP rises, and its PP by as much. Nothing for a move that cannot take them. */
function ppRaised(slot: MoveSlot, ppUps: number, pack: DataPack): MoveSlot | undefined {
  const move = pack.moves[slot.id]
  if (!move || move.fixedPp || slot.ppUps >= PP_UPS_MAX) return undefined
  const raised = Math.min(PP_UPS_MAX, slot.ppUps + ppUps)
  return { ...slot, ppUps: raised, pp: slot.pp + maxPp(move.pp, raised, false) - maxPp(move.pp, slot.ppUps, false) }
}

/** The character once the item was used on it; nothing when the item does nothing for it now. */
function withEffect(target: CharacterDocument, item: ItemData, moveId: string | undefined, pack: DataPack): CharacterDocument | undefined {
  const maxHp = maxHpOf(target, pack)
  if (maxHp === undefined) return undefined
  const effect = item.bag ?? {}
  // A revival item works on a Pokémon that is down and on nothing else; nothing else works on one that is down.
  if (effect.revive) return isDown(target) ? revived(target, effect.revive === 'full' ? maxHp : Math.floor(maxHp / 2)) : undefined
  if (isDown(target)) return undefined

  let next = target
  if (effect.heal !== undefined && target.hp < maxHp) {
    const amount = effect.heal === 'full' ? maxHp : typeof effect.heal === 'number' ? effect.heal : Math.floor(maxHp * effect.heal.fraction)
    next = { ...next, hp: Math.min(maxHp, target.hp + amount) }
  }
  if (effect.cure && target.status !== undefined && (effect.cure === 'all' || effect.cure.includes(target.status))) {
    next = { ...next }
    delete next.status
  }
  const forMove = (change: (slot: MoveSlot) => MoveSlot | undefined, only: string | undefined): void => {
    const moves = next.moves.map((slot) => (only === undefined || slot.id === only ? (change(slot) ?? slot) : slot))
    if (moves.some((slot, at) => slot !== next.moves[at])) next = { ...next, moves }
  }
  const restore = effect.restorePp
  if (restore && (restore.scope === 'all' || moveId !== undefined)) forMove((slot) => ppRestored(slot, restore.amount, pack), restore.scope === 'all' ? undefined : moveId)
  const ppUps = item.ppUps
  if (ppUps !== undefined && moveId !== undefined) forMove((slot) => ppRaised(slot, ppUps, pack), moveId)
  return next === target ? undefined : next
}

/**
 * The party once an item was used outside a fight. The item leaves the Bag
 * it came from, unless using it does not use it up; one that does nothing
 * stays, and nothing changes.
 */
export function withItemUsed(party: readonly CharacterDocument[], use: ItemUse, pack: DataPack): PartyChanged<ItemProblem> {
  const find = (id: string): CharacterDocument | undefined => party.find((member) => member.id === id)
  const user = find(use.user)
  const target = find(use.target)
  const owner = use.from === undefined ? user : find(use.from)
  if (!user || !target || !owner) return { ok: false, problem: 'unknown-character' }
  if (isDown(user)) return { ok: false, problem: 'user-down' }
  if (use.from !== undefined && !isDown(owner)) return { ok: false, problem: 'bag-closed' }
  const item = pack.items[use.item]
  if (!item || countOf(owner.bag, use.item) < 1) return { ok: false, problem: 'no-item' }

  const changed = new Map<string, CharacterDocument>()
  if (item.bag?.reviveAll) {
    // Every teammate that is down, the dead with the downed, fully (decision 172).
    for (const member of party) {
      const maxHp = maxHpOf(member, pack)
      if (isDown(member) && maxHp !== undefined) changed.set(member.id, revived(member, maxHp))
    }
  } else {
    const next = withEffect(target, item, use.move, pack)
    if (next) changed.set(target.id, next)
  }
  if (changed.size === 0) return { ok: false, problem: 'no-effect' }

  if (!item.reusable) {
    const from = changed.get(owner.id) ?? owner
    changed.set(owner.id, { ...from, bag: withFewer(from.bag, use.item, 1) ?? from.bag })
  }
  return { ok: true, party: party.map((member) => (changed.has(member.id) ? revised(changed.get(member.id) ?? member) : member)) }
}

/** Items moved from the Bag of a teammate who is downed or dead into one's own (decision 175). */
export interface ItemsTaken {
  taker: string
  from: string
  item: string
  quantity: number
}

export type TakeProblem =
  | 'unknown-character'
  /** Only a character on its feet takes anything. */
  | 'taker-down'
  | 'bag-closed'
  | 'no-item'
  /** The taker's Bag cannot hold that many. */
  | 'bag-full'

export function withItemsTaken(party: readonly CharacterDocument[], take: ItemsTaken): PartyChanged<TakeProblem> {
  const taker = party.find((member) => member.id === take.taker)
  const owner = party.find((member) => member.id === take.from)
  if (!taker || !owner) return { ok: false, problem: 'unknown-character' }
  if (isDown(taker)) return { ok: false, problem: 'taker-down' }
  if (!isDown(owner)) return { ok: false, problem: 'bag-closed' }
  const left = Number.isInteger(take.quantity) && take.quantity >= 1 ? withFewer(owner.bag, take.item, take.quantity) : undefined
  if (!left) return { ok: false, problem: 'no-item' }
  const gained = withMore(taker.bag, take.item, take.quantity)
  if (!gained) return { ok: false, problem: 'bag-full' }
  return { ok: true, party: party.map((member) => (member.id === taker.id ? revised(taker, { bag: gained }) : member.id === owner.id ? revised(owner, { bag: left }) : member)) }
}

export type HoldProblem =
  /** Only a character on its feet changes what it holds. */
  | 'down'
  | 'no-item'
  | 'not-holdable'
  /** The item it held cannot go back into its Bag. */
  | 'bag-full'
  /** It already holds that, or already holds nothing. */
  | 'nothing'

/**
 * The character holding another item of its Bag, or nothing (decision 6). The
 * item it held goes back into its Bag.
 */
export function withHeldItem(character: CharacterDocument, item: string | undefined, pack: DataPack): Changed<HoldProblem> {
  if (isDown(character)) return { ok: false, problem: 'down' }
  if (item === character.heldItem) return { ok: false, problem: 'nothing' }
  let bag: readonly { item: string; quantity: number }[] | undefined = character.bag
  if (item !== undefined) {
    if (countOf(bag, item) < 1) return { ok: false, problem: 'no-item' }
    if (!pack.items[item]?.holdable) return { ok: false, problem: 'not-holdable' }
    bag = withFewer(bag, item, 1)
  }
  if (bag && character.heldItem !== undefined) bag = withMore(bag, character.heldItem, 1)
  if (!bag) return { ok: false, problem: 'bag-full' }
  const next = revised(character, { bag: [...bag] })
  if (item === undefined) delete next.heldItem
  else next.heldItem = item
  return { ok: true, character: next }
}
