/**
 * Turning Showdown's learnset sources into what Denborn needs to know about a
 * move: from which level it is learned by level-up, and whether it can also be
 * had from a TM, a tutor or as an egg move.
 *
 * A source is a generation number, a letter and sometimes a number: "9L15" is
 * "level 15 in Gen 9", "8M" a Gen 8 TM, "7E" a Gen 7 egg move.
 *
 * Rules (DECISIONS.md): the level is the one from the newest generation in
 * which the species learns the move by level-up (decision 27); a move learned
 * on evolution counts as level 0; TM, tutor and egg sources of any generation
 * count; Volt Tackle's special-breeding source counts as an egg move
 * (decision 72); event and transfer-only sources do not count, nor do Dream
 * World sources (decision 80).
 */

export interface MoveSources {
  /** Level from which the move is learned by level-up; 0 means on evolution. Absent: never by level-up. */
  level?: number
  tm?: true
  tutor?: true
  egg?: true
}

export interface LearnsetEntry extends MoveSources {
  move: string
}

const SOURCE = /^(\d+)([A-Z])(\d*)$/

export function readSources(sources: readonly string[]): MoveSources {
  const facts: MoveSources = {}
  let newestGeneration = -1
  for (const source of sources) {
    const match = SOURCE.exec(source)
    if (!match) throw new Error(`Unreadable learnset source "${source}"`)
    const generation = Number(match[1])
    const letter = match[2]
    switch (letter) {
      case 'L': {
        const level = Number(match[3])
        if (generation > newestGeneration) {
          newestGeneration = generation
          facts.level = level
        } else if (generation === newestGeneration && facts.level !== undefined) {
          facts.level = Math.min(facts.level, level)
        }
        break
      }
      case 'M':
        facts.tm = true
        break
      case 'T':
        facts.tutor = true
        break
      case 'E':
      case 'R': // special breeding (Volt Tackle), counted as an egg move
        facts.egg = true
        break
      case 'S': // event
      case 'V': // transfer from the Virtual Console games
      case 'D': // Dream World
        break
      default:
        throw new Error(`Unknown learnset source letter in "${source}"`)
    }
  }
  return facts
}

function hasAny(facts: MoveSources): boolean {
  return facts.level !== undefined || Boolean(facts.tm || facts.tutor || facts.egg)
}

/**
 * A species' learnset with those of its earlier stages (decision 28): a move is
 * available from the lowest level at which any stage learns it, and from any
 * other source any stage has.
 */
export function mergeStages(stages: readonly Readonly<Record<string, readonly string[]>>[]): LearnsetEntry[] {
  const merged = new Map<string, MoveSources>()
  for (const stage of stages) {
    for (const [move, sources] of Object.entries(stage)) {
      const facts = readSources(sources)
      if (!hasAny(facts)) continue
      const known = merged.get(move)
      if (!known) {
        merged.set(move, facts)
        continue
      }
      if (facts.level !== undefined) known.level = Math.min(known.level ?? facts.level, facts.level)
      if (facts.tm) known.tm = true
      if (facts.tutor) known.tutor = true
      if (facts.egg) known.egg = true
    }
  }
  return [...merged]
    .map(([move, facts]) => ({ move, ...facts }))
    .sort((a, b) => (a.move < b.move ? -1 : a.move > b.move ? 1 : 0))
}
