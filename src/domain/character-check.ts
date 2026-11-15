/**
 * Checks a character against the rules it was made under and the game data.
 *
 * `checkCharacter` holds what must be true of a character at any time; it is
 * what the GM's device runs on every character that joins, and what an
 * imported file or code must pass. `checkCreation` adds what must be true of
 * one that has just been created. Both return the list of what is wrong.
 */
import type { DataPack } from '../data/types.ts'
import { type AttributeProblem, checkAttributes } from '../game-rules/attributes.ts'
import { expForLevel, levelForExp } from '../game-rules/exp.ts'
import { type NicknameProblem, checkNickname, tidyNickname } from '../game-rules/nickname.ts'
import { maxPp } from '../game-rules/pp.ts'
import { computeStats } from '../game-rules/stats.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { ItemStack } from '../shared/schema/common.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { type BuildProblem, checkBuild } from './build-check.ts'
import { repeated } from './repeated.ts'

export type CharacterProblem =
  | BuildProblem
  /** The rules given are not the version the character names. */
  | { kind: 'other-rules-version'; character: number; rules: number }
  | { kind: 'nickname'; problem: NicknameProblem | 'untidy' }
  | { kind: 'below-starting-level' }
  | { kind: 'exp-does-not-match-level' }
  | { kind: 'attributes'; problem: AttributeProblem }
  | { kind: 'pp-above-max'; move: string }
  | { kind: 'unknown-item'; item: string }
  | { kind: 'repeated-item'; item: string }
  /** HP out of step with the condition: none while standing, some while downed or dead, or more than the maximum. */
  | { kind: 'hp' }
  | { kind: 'status-while-down' }

export type CreationProblem =
  | CharacterProblem
  | { kind: 'species-not-playable' }
  | { kind: 'not-starting-level' }
  | { kind: 'not-starting-money' }
  | { kind: 'not-full-hp' }
  | { kind: 'pp-not-full'; move: string }
  /** The held item and the bag together are not one of the campaign's item packs. */
  | { kind: 'not-an-item-pack' }

/** The character's maximum HP, or nothing when its species or nature is unknown. */
export function maxHpOf(character: CharacterDocument, pack: DataPack): number | undefined {
  const species = pack.species[character.species]
  const nature = character.nature === undefined ? {} : pack.natures[character.nature]
  if (!species || !nature) return undefined
  return computeStats({ baseStats: species.baseStats, ivs: character.ivs, evs: character.evs, level: character.level, nature }).hp
}

export function checkCharacter(character: CharacterDocument, rules: CampaignRules, pack: DataPack): CharacterProblem[] {
  const problems: CharacterProblem[] = []
  if (character.campaign.rulesVersion !== rules.version) {
    problems.push({ kind: 'other-rules-version', character: character.campaign.rulesVersion, rules: rules.version })
  }

  const nickname = checkNickname(tidyNickname(character.nickname))
  if (nickname) problems.push({ kind: 'nickname', problem: nickname })
  else if (tidyNickname(character.nickname) !== character.nickname) problems.push({ kind: 'nickname', problem: 'untidy' })

  if (character.level < rules.startingLevel) problems.push({ kind: 'below-starting-level' })
  if (levelForExp(character.exp) !== character.level) problems.push({ kind: 'exp-does-not-match-level' })
  for (const problem of checkAttributes(character.attributes, character.level)) problems.push({ kind: 'attributes', problem })

  const carried = character.bag.map((stack) => stack.item)
  for (const item of new Set(carried)) {
    if (!(item in pack.items)) problems.push({ kind: 'unknown-item', item })
  }
  for (const item of repeated(carried)) problems.push({ kind: 'repeated-item', item })

  if (character.condition.state !== 'standing' && character.status !== undefined) problems.push({ kind: 'status-while-down' })

  // Its build follows the same rules as an enemy's.
  problems.push(...checkBuild(character, rules, pack))

  // PP left: no more than the move holds, with the PP Ups spent on it.
  for (const slot of character.moves) {
    const move = pack.moves[slot.id]
    if (move && !(move.fixedPp && slot.ppUps > 0) && slot.pp > maxPp(move.pp, slot.ppUps, move.fixedPp)) problems.push({ kind: 'pp-above-max', move: slot.id })
  }

  const maxHp = maxHpOf(character, pack)
  const standing = character.condition.state === 'standing'
  if (standing ? character.hp < 1 || (maxHp !== undefined && character.hp > maxHp) : character.hp !== 0) problems.push({ kind: 'hp' })
  return problems
}

/** The same items in the same quantities, in any order. */
function sameItems(a: readonly ItemStack[], b: readonly ItemStack[]): boolean {
  const count = (stacks: readonly ItemStack[]): Map<string, number> => {
    const totals = new Map<string, number>()
    for (const stack of stacks) totals.set(stack.item, (totals.get(stack.item) ?? 0) + stack.quantity)
    return totals
  }
  const left = count(a)
  const right = count(b)
  return left.size === right.size && [...left].every(([item, quantity]) => right.get(item) === quantity)
}

export function checkCreation(character: CharacterDocument, rules: CampaignRules, pack: DataPack): CreationProblem[] {
  const problems: CreationProblem[] = checkCharacter(character, rules, pack)
  if (!rules.species.includes(character.species)) problems.push({ kind: 'species-not-playable' })
  if (character.level !== rules.startingLevel || character.exp !== expForLevel(character.level)) problems.push({ kind: 'not-starting-level' })
  if (character.money !== rules.startingMoney) problems.push({ kind: 'not-starting-money' })

  const maxHp = maxHpOf(character, pack)
  if (character.condition.state !== 'standing' || character.status !== undefined || (maxHp !== undefined && character.hp !== maxHp)) {
    problems.push({ kind: 'not-full-hp' })
  }
  for (const slot of character.moves) {
    const move = pack.moves[slot.id]
    if (move && (slot.ppUps !== 0 || slot.pp !== move.pp)) problems.push({ kind: 'pp-not-full', move: slot.id })
  }

  // The held item was taken out of the bag: together they must be exactly one of the packs.
  const owned = character.heldItem === undefined ? character.bag : [...character.bag, { item: character.heldItem, quantity: 1 }]
  if (!rules.itemPacks.some((itemPack) => sameItems(itemPack.items, owned))) problems.push({ kind: 'not-an-item-pack' })
  return problems
}
