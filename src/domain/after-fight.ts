/**
 * A character once a fight is over: how the fight left it (decisions 58 and
 * 136), and what it is awarded (decisions 4, 130 and 161). Pure: the fight
 * itself is played elsewhere; this only writes its outcome into the document.
 */
import type { DataPack } from '../data/types.ts'
import { MAX_LEVEL, expForLevel, levelForExp } from '../game-rules/exp.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { ItemStack } from '../shared/schema/common.ts'
import { maxHpOf } from './character-check.ts'

/** How a fight left one Pokémon. */
export interface FightLeft {
  hp: number
  /** The engine's word for its status condition; empty when it has none. */
  status: string
  downed: boolean
  dead: boolean
  /** Agony stacks left, for a downed Pokémon. */
  stacks: number
  /** The PP left to each of its moves. */
  moves: readonly { id: string; pp: number }[]
  /** True when the item it held was eaten or used up. */
  itemSpent: boolean
}

const STATUSES = ['psn', 'tox', 'brn', 'par', 'slp', 'frz'] as const
const MONEY_MAX = 999_999_999

/**
 * The character as the fight left it: its HP, PP and status stay as they
 * are; a downed character stays downed with its stacks, a dead one is dead;
 * an item eaten or used up is gone, while one knocked off, stolen or swapped
 * is back in its holder's hands; its bag is what the fight left of it.
 */
export function afterFight(character: CharacterDocument, left: FightLeft, bag: readonly ItemStack[]): CharacterDocument {
  const status = STATUSES.find((known) => known === left.status)
  const fallen = left.dead || left.downed
  const next: CharacterDocument = {
    ...character,
    revision: character.revision + 1,
    hp: fallen ? 0 : left.hp,
    condition: left.dead ? { state: 'dead' } : left.downed ? { state: 'downed', stacks: Math.min(3, Math.max(1, left.stacks)) } : { state: 'standing' },
    moves: character.moves.map((slot) => ({ ...slot, pp: left.moves.find((move) => move.id === slot.id)?.pp ?? slot.pp })),
    bag: bag.map((stack) => ({ ...stack })),
  }
  // Nothing sticks to a Pokémon at 0 HP: its status went when it fell.
  if (status && !fallen) next.status = status
  else delete next.status
  if (left.itemSpent) delete next.heldItem
  return next
}

/**
 * The character with EXP and Pokédollars added. Its level follows its EXP at
 * once (decision 161): its stats follow the level, and its HP rises by what
 * its maximum gained, as in the games. A Pokémon at 0 HP stays there. The
 * points the level brings wait to be placed; its moves do not change.
 */
export function awarded(character: CharacterDocument, exp: number, money: number, pack: DataPack): CharacterDocument {
  const total = Math.min(expForLevel(MAX_LEVEL), character.exp + Math.max(0, Math.floor(exp)))
  const level = Math.max(character.level, levelForExp(total))
  const next: CharacterDocument = { ...character, revision: character.revision + 1, exp: total, level, money: Math.min(MONEY_MAX, character.money + Math.max(0, Math.floor(money))) }
  if (level === character.level || character.hp === 0) return next
  const before = maxHpOf(character, pack)
  const after = maxHpOf(next, pack)
  return before === undefined || after === undefined ? next : { ...next, hp: Math.min(after, character.hp + (after - before)) }
}
