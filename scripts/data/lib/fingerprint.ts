/**
 * A fingerprint of the data pack: a short hash of every entry. Comparing two
 * fingerprints tells what was added, removed or changed between two packs.
 */
import type { DataPack } from '../../../src/data/types.ts'
import { sha256, stableJson } from './pinned.ts'

export const SECTIONS = ['species', 'moves', 'abilities', 'items', 'natures', 'types'] as const

export interface Fingerprint {
  version: string
  /** A short hash of every entry, by section and id. */
  sections: Record<string, Record<string, string>>
}

export function fingerprintOf(pack: DataPack): Fingerprint {
  const sections: Fingerprint['sections'] = {}
  for (const section of SECTIONS) {
    sections[section] = Object.fromEntries(
      Object.entries(pack[section]).map(([id, entry]) => [id, sha256(new TextEncoder().encode(stableJson(entry, 0))).slice(0, 10)]),
    )
  }
  return { version: pack.version, sections }
}

/** What changed between two packs, one line per entry. */
export function changes(before: Fingerprint, after: Fingerprint): string[] {
  const lines: string[] = []
  for (const section of SECTIONS) {
    const old = before.sections[section] ?? {}
    const next = after.sections[section] ?? {}
    for (const id of Object.keys(next)) {
      if (!(id in old)) lines.push(`+ ${section}/${id}`)
      else if (old[id] !== next[id]) lines.push(`~ ${section}/${id}`)
    }
    for (const id of Object.keys(old)) if (!(id in next)) lines.push(`- ${section}/${id}`)
  }
  return lines
}
