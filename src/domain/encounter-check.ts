/**
 * Checks an encounter against a campaign's rules and the game data. Each
 * enemy is built under the same rules as a character (build-check.ts); the
 * encounter adds what holds between them and for the Bag they share.
 */
import type { DataPack } from '../data/types.ts'
import { type NicknameProblem, checkNickname, tidyNickname } from '../game-rules/nickname.ts'
import type { Encounter, Enemy } from '../shared/schema/encounter.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { type BuildProblem, checkBuild } from './build-check.ts'
import { repeated } from './repeated.ts'

export type EnemyProblem = BuildProblem | { kind: 'nickname'; problem: NicknameProblem | 'untidy' }

export type EncounterProblem =
  /** Something is wrong with one enemy: which one, by its place on the line, and what. */
  | { kind: 'enemy'; at: number; problem: EnemyProblem }
  /** Two enemies share an id: one could not be told from the other in a fight. */
  | { kind: 'repeated-enemy'; id: string }
  | { kind: 'unknown-item'; item: string }
  /** An item that does nothing when used from the Bag has no place in an encounter's Bag. */
  | { kind: 'not-a-bag-item'; item: string }
  | { kind: 'repeated-item'; item: string }

export function checkEnemy(enemy: Enemy, rules: CampaignRules, pack: DataPack): EnemyProblem[] {
  const problems: EnemyProblem[] = []
  if (enemy.nickname !== undefined) {
    const nickname = checkNickname(tidyNickname(enemy.nickname))
    if (nickname) problems.push({ kind: 'nickname', problem: nickname })
    else if (tidyNickname(enemy.nickname) !== enemy.nickname) problems.push({ kind: 'nickname', problem: 'untidy' })
  }
  return [...problems, ...checkBuild(enemy, rules, pack)]
}

export function checkEncounter(encounter: Encounter, rules: CampaignRules, pack: DataPack): EncounterProblem[] {
  const problems: EncounterProblem[] = []
  encounter.enemies.forEach((enemy, at) => {
    for (const problem of checkEnemy(enemy, rules, pack)) problems.push({ kind: 'enemy', at, problem })
  })
  for (const id of repeated(encounter.enemies.map((enemy) => enemy.id))) problems.push({ kind: 'repeated-enemy', id })

  const carried = encounter.bag.map((stack) => stack.item)
  for (const item of new Set(carried)) {
    const data = pack.items[item]
    if (!data) problems.push({ kind: 'unknown-item', item })
    else if (!data.bag) problems.push({ kind: 'not-a-bag-item', item })
  }
  for (const item of repeated(carried)) problems.push({ kind: 'repeated-item', item })
  return problems
}
