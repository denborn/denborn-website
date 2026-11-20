/**
 * A nature chosen by what it does (decision 291): the stat it raises and the
 * stat it lowers name it. The same stat for both is a nature that changes
 * nothing; the games have one of those for each of the five stats.
 */
import type { NatureData, StatId } from '../../data/types.ts'

/** The five stats a nature can raise or lower, in the games' order. */
export const NATURE_STATS: readonly StatId[] = ['atk', 'def', 'spa', 'spd', 'spe']

/** Where the games' table of natures puts each one that changes nothing: on its diagonal, one per stat. */
const NEUTRAL_AT: Partial<Record<StatId, string>> = { atk: 'hardy', def: 'docile', spa: 'bashful', spd: 'quirky', spe: 'serious' }

type Natures = Readonly<Record<string, NatureData>>

const isNeutral = (nature: NatureData): boolean => nature.plus === undefined && nature.minus === undefined

/**
 * The nature that raises one stat and lowers another. For the same stat
 * twice: the neutral nature the games put there, or any neutral one when the
 * game data does not have it. Nothing when the game data has no such nature.
 */
export function natureFor(natures: Natures, raised: StatId, lowered: StatId): string | undefined {
  const all = Object.values(natures)
  if (raised !== lowered) return all.find((nature) => nature.plus === raised && nature.minus === lowered)?.id
  const there = NEUTRAL_AT[raised]
  return there !== undefined && there in natures ? there : all.find(isNeutral)?.id
}

/** The stat a nature raises and the one it lowers. A nature that changes nothing has the same stat for both: the games' own, or the first of the five. */
export function statsOf(natures: Natures, nature: string | undefined): { raised: StatId; lowered: StatId } | undefined {
  const data = nature === undefined ? undefined : natures[nature]
  if (!data) return undefined
  if (data.plus !== undefined && data.minus !== undefined) return { raised: data.plus, lowered: data.minus }
  const stat = NATURE_STATS.find((one) => NEUTRAL_AT[one] === data.id) ?? NATURE_STATS[0]
  return stat && { raised: stat, lowered: stat }
}
