/** Reads and checks data-sources/bag-effects.json, the project's own table of what Bag items do. */
import { join } from 'node:path'
import type { BagEffect } from '../../../src/game-rules/bag-effects.ts'
import { ROOT, readJson } from './pinned.ts'

export interface BagTable {
  /** By PokéAPI item identifier. */
  effects: Record<string, BagEffect>
  /** PP Ups given to one move, by PokéAPI item identifier. */
  ppUps: Record<string, number>
  /** PokéAPI identifiers of items spent by an evolution that Showdown does not have. */
  evolution: string[]
  /** Items of the Bag categories that are left out, with the reason. */
  excluded: Record<string, string>
}

const STATUSES = new Set(['psn', 'tox', 'brn', 'par', 'slp', 'frz'])
const STATS = new Set(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy'])
const KEYS = new Set(['heal', 'cure', 'cureConfusion', 'revive', 'reviveAll', 'restorePp', 'boost', 'crit', 'guard'])

/** Why an effect is not one the Bag action knows how to apply, or null when it is. */
export function effectProblem(effect: unknown): string | null {
  if (effect === null || typeof effect !== 'object' || Array.isArray(effect)) return 'is not an object'
  const entries = Object.entries(effect as Record<string, unknown>)
  if (!entries.length) return 'does nothing'
  for (const [key, value] of entries) {
    if (!KEYS.has(key)) return `has an unknown part "${key}"`
    switch (key) {
      case 'heal': {
        const fraction = (value as { fraction?: unknown } | null)?.fraction
        const ok =
          value === 'full' ||
          (typeof value === 'number' && value > 0) ||
          (typeof fraction === 'number' && fraction > 0 && fraction <= 1)
        if (!ok) return 'has a heal that is neither a positive amount, a fraction nor "full"'
        break
      }
      case 'cure':
        if (value !== 'all' && !(Array.isArray(value) && value.length && value.every((id) => STATUSES.has(String(id))))) {
          return 'cures something that is not a status condition'
        }
        break
      case 'revive':
        if (value !== 'half' && value !== 'full') return 'revives with neither half nor full HP'
        break
      case 'restorePp': {
        const part = value as { amount?: unknown; scope?: unknown } | null
        const amountOk = part?.amount === 'full' || (typeof part?.amount === 'number' && part.amount > 0)
        if (!amountOk || (part.scope !== 'one' && part.scope !== 'all')) return 'has an unreadable PP restoration'
        break
      }
      case 'boost': {
        const part = value as { stat?: unknown; stages?: unknown } | null
        if (!STATS.has(String(part?.stat)) || typeof part?.stages !== 'number' || part.stages < 1 || part.stages > 6) {
          return 'has an unreadable stat boost'
        }
        break
      }
      default:
        if (value !== true) return `has "${key}" set to something other than true`
    }
  }
  return null
}

export async function readBagTable(): Promise<BagTable> {
  const table = await readJson<BagTable>(join(ROOT, 'data-sources/bag-effects.json'))
  for (const [item, effect] of Object.entries(table.effects)) {
    const problem = effectProblem(effect)
    if (problem) throw new Error(`data-sources/bag-effects.json: "${item}" ${problem}`)
  }
  return table
}
