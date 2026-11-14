/**
 * Checks a campaign's rules against the game data: everything a schema
 * cannot know. Each check returns the list of what is wrong, so that the
 * rules editor can say what to fix and a link from elsewhere can be refused
 * with a reason.
 */
import type { DataPack } from '../data/types.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { repeated } from './repeated.ts'

export type RulesProblem =
  | { kind: 'unknown-species'; species: string }
  | { kind: 'repeated-species'; species: string }
  | { kind: 'unknown-move'; move: string }
  /** The move exists, but is not one a GM may add to the common moves (decision 71). */
  | { kind: 'move-not-offered'; move: string }
  | { kind: 'repeated-move'; move: string }
  | { kind: 'blank-pack-name'; pack: number }
  | { kind: 'repeated-pack-name'; pack: number }
  | { kind: 'unknown-item'; pack: number; item: string }
  | { kind: 'repeated-item'; pack: number; item: string }

export function checkRules(rules: CampaignRules, pack: DataPack): RulesProblem[] {
  const problems: RulesProblem[] = []
  for (const species of new Set(rules.species)) {
    if (!(species in pack.species)) problems.push({ kind: 'unknown-species', species })
  }
  for (const species of repeated(rules.species)) problems.push({ kind: 'repeated-species', species })

  for (const move of new Set(rules.commonMoves)) {
    const data = pack.moves[move]
    if (!data) problems.push({ kind: 'unknown-move', move })
    else if (!data.supplement) problems.push({ kind: 'move-not-offered', move })
  }
  for (const move of repeated(rules.commonMoves)) problems.push({ kind: 'repeated-move', move })

  const names = rules.itemPacks.map((itemPack) => itemPack.name.trim().toLowerCase())
  rules.itemPacks.forEach((itemPack, index) => {
    if (names[index] === '') problems.push({ kind: 'blank-pack-name', pack: index })
    // A player picks a pack by its name: two packs must not share one.
    else if (names.indexOf(names[index] ?? '') !== index) problems.push({ kind: 'repeated-pack-name', pack: index })
    const items = itemPack.items.map((stack) => stack.item)
    for (const item of new Set(items)) {
      if (!(item in pack.items)) problems.push({ kind: 'unknown-item', pack: index, item })
    }
    for (const item of repeated(items)) problems.push({ kind: 'repeated-item', pack: index, item })
  })
  return problems
}

/** True when the versions of a rules history run 1, 2, 3… with nothing missing: the last one is in force. */
export function isRulesHistoryInOrder(history: readonly CampaignRules[]): boolean {
  return history.every((rules, index) => rules.version === index + 1)
}
