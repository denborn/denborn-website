/**
 * The list a move is chosen from (decisions 293 and 308): the moves offered,
 * narrowed by a part of a name or by a type, in the alphabet's order. Pure:
 * the move picker shows what this gives.
 */
import type { DataPack, Localized, MoveData } from '../../data/types.ts'
import { answers } from '../../shared/text/plain.ts'

export interface MoveFilter {
  /** Part of a name. */
  search: string
  /** A type's name as the game data's moves have it; nothing for any. */
  type: string | undefined
}

/** Every move offered is listed. */
export const NO_MOVE_FILTER: MoveFilter = { search: '', type: undefined }

/** The moves to show, of those offered: in the alphabet's order in the language shown, accents and capitals set aside. */
export function movesListed(offered: readonly string[], pack: DataPack, filter: MoveFilter, language: keyof Localized): MoveData[] {
  const alphabet = new Intl.Collator(language, { sensitivity: 'base' })
  return offered
    .map((id) => pack.moves[id])
    .filter((move): move is MoveData => move !== undefined)
    .filter((move) => answers(move.name[language], filter.search) && (filter.type === undefined || move.type === filter.type))
    .sort((a, b) => alphabet.compare(a.name[language], b.name[language]))
}

/** The types of the moves offered, each once, in the alphabet's order: what the type picker steps through. */
export function typesOffered(offered: readonly string[], pack: DataPack): string[] {
  return [...new Set(offered.map((id) => pack.moves[id]?.type).filter((type): type is string => type !== undefined))].sort()
}
