/** Names and in-game texts from PokéAPI's tables, in English and French. */
import type { PokeapiLock, Row, Table } from './pokeapi.ts'
import { readTable } from './pokeapi.ts'

export interface Localized {
  en: string
  fr: string
}

/** Showdown's id for a name: lower-case letters and digits only. */
export function toId(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Version groups whose texts are used, best first: the main-series games from
 * the newest back. Spin-offs and remakes with their own wording come last.
 */
const TEXT_PREFERENCE = [
  'scarlet-violet',
  'the-indigo-disk',
  'the-teal-mask',
  'sword-shield',
  'the-crown-tundra',
  'the-isle-of-armor',
  'ultra-sun-ultra-moon',
  'sun-moon',
  'omega-ruby-alpha-sapphire',
  'x-y',
  'black-2-white-2',
  'black-white',
  'brilliant-diamond-shining-pearl',
  'heartgold-soulsilver',
  'platinum',
  'diamond-pearl',
  'lets-go-pikachu-lets-go-eevee',
  'legends-arceus',
  'legends-za',
  'mega-dimension',
  'champions',
]

/**
 * In-game texts are stored with the games' line breaks and soft hyphens. A
 * few rows carry a line break written out as a backslash and an "n" instead
 * of the character itself.
 */
export function tidy(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/­\s*\n/g, '')
    .replace(/-\n(?=\p{Ll})/gu, '-')
    .replace(/[\n\f\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface Texts {
  language: { en: string; fr: string }
  /** English and French names of a resource row, by its PokéAPI id. */
  names(table: Table, idColumn: string): Promise<Map<string, Partial<Localized>>>
  /** The best available in-game text of a resource row in each language, by its PokéAPI id. */
  flavor(table: Table, idColumn: string): Promise<Map<string, Partial<Localized>>>
}

export async function loadTexts(lock: PokeapiLock): Promise<Texts> {
  const languages = await readTable(lock, 'languages')
  const idOf = (identifier: string): string => {
    const row = languages.find((language) => language.identifier === identifier)
    if (!row?.id) throw new Error(`PokéAPI has no language "${identifier}"`)
    return row.id
  }
  const language = { en: idOf('en'), fr: idOf('fr') }

  const versionGroups = await readTable(lock, 'version_groups')
  const rank = new Map<string, number>()
  for (const group of versionGroups) {
    const position = TEXT_PREFERENCE.indexOf(group.identifier ?? '')
    if (position >= 0 && group.id) rank.set(group.id, position)
  }

  const pick = (row: Row, key: string): string => row[key] ?? ''

  return {
    language,
    async names(table, idColumn) {
      const out = new Map<string, Partial<Localized>>()
      for (const row of await readTable(lock, table)) {
        const which = row.local_language_id === language.en ? 'en' : row.local_language_id === language.fr ? 'fr' : null
        if (!which) continue
        const entry = out.get(pick(row, idColumn)) ?? {}
        entry[which] = pick(row, 'name')
        out.set(pick(row, idColumn), entry)
      }
      return out
    },
    async flavor(table, idColumn) {
      const best = new Map<string, { en?: [number, string]; fr?: [number, string] }>()
      for (const row of await readTable(lock, table)) {
        const which = row.language_id === language.en ? 'en' : row.language_id === language.fr ? 'fr' : null
        const position = rank.get(pick(row, 'version_group_id'))
        if (!which || position === undefined) continue
        const entry = best.get(pick(row, idColumn)) ?? {}
        const current = entry[which]
        if (!current || position < current[0]) entry[which] = [position, tidy(pick(row, 'flavor_text'))]
        best.set(pick(row, idColumn), entry)
      }
      const out = new Map<string, Partial<Localized>>()
      for (const [id, entry] of best) {
        const texts: Partial<Localized> = {}
        if (entry.en) texts.en = entry.en[1]
        if (entry.fr) texts.fr = entry.fr[1]
        out.set(id, texts)
      }
      return out
    },
  }
}
