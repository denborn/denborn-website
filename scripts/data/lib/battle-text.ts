/**
 * The games' own battle messages, in English and French (decision 154), from
 * the text of Pokémon Scarlet and Violet as Poké Corpus keeps it, at the
 * version pinned in data-sources/battle-text.lock.json.
 *
 * Only the ids of the lines are committed (data-sources/battle-messages.json).
 * The lines are read here, turned into sentences with named gaps, and written
 * into a generated file that is never committed.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CACHE, ROOT, ensureFile, readJson, writeJson } from './pinned.ts'

export const BATTLE_TEXT_LOCK = join(ROOT, 'data-sources/battle-text.lock.json')
const MAPPING = join(ROOT, 'data-sources/battle-messages.json')

export interface BattleTextLock {
  repository: string
  commit: string
  committedAt: string
  path: string
  licence: string
  /** SHA-256 of each file, by file name. */
  files: Record<string, string>
}

interface Mapping {
  /** Lines that announce a move, one per move: the sentence is what they share around the move's name. */
  moveUsed: string[]
  /** Our name for a message, and the id of the line that says it. */
  messages: Record<string, string>
}

export type Localized = { en: string; fr: string }

/** The line ids, then the same lines in each language: three files, line for line. */
const FILES = { ids: 'qid_common.txt', en: 'en_common.txt', fr: 'fr_common.txt' } as const

const cachePath = (lock: BattleTextLock, file: string): string => join(CACHE, 'battle-text', lock.commit, file)

/** Downloads the three files that are not in the cache yet and checks them against the lock; with `pin`, records their checksums instead. */
export async function ensureBattleText(pin = false): Promise<BattleTextLock> {
  const lock = await readJson<BattleTextLock>(BATTLE_TEXT_LOCK)
  const base = `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${lock.path}`
  const sums: Record<string, string> = {}
  for (const file of Object.values(FILES)) {
    const expected = lock.files[file]
    if (expected === undefined && !pin) throw new Error(`${file} has no checksum in ${BATTLE_TEXT_LOCK}; run the script with --pin after reviewing the source`)
    sums[file] = await ensureFile({ url: `${base}/${file}`, path: cachePath(lock, file), sha256: expected })
  }
  if (pin) await writeJson(BATTLE_TEXT_LOCK, { ...lock, files: sums })
  return lock
}

/** What kind of thing a variable of the games' text stands for, by its code. */
const GAPS: Record<string, string> = { '0101': 'pokemon', '0102': 'pokemon', '0106': 'ability', '0107': 'move', '0109': 'item', '010A': 'item' }
/** Variables that only style the text, or mark where a sentence starts: nothing to say. */
const SILENT = new Set(['BD06', 'FF00'])
/** French "de" before a name, which the games elide before a vowel: left as a gap for the app to settle once it knows the name. */
const DE = '1408'

/**
 * A line of the games' text as a sentence with named gaps: `{pokemon0}`,
 * `{move1}`, and `{de}` where French says "de" or "d’" before the name that
 * follows. Lists the variables it could not turn into a gap.
 */
export function sentenceOf(line: string): { text: string; unknown: string[] } {
  const unknown: string[] = []
  const text = line
    .replace(/\[VAR ([0-9A-F]{4})(?:\(([0-9A-F,]*)\))?\]/g, (whole, code: string, args: string | undefined) => {
      if (SILENT.has(code)) return ''
      if (code === DE) return '{de}'
      const gap = GAPS[code]
      if (!gap) {
        unknown.push(whole)
        return whole
      }
      return `{${gap}${parseInt((args ?? '0').split(',')[0] ?? '0', 16)}}`
    })
    // Line breaks and the marks that end a text box are the games' layout, not ours.
    .replace(/\\n/g, ' ')
    .replace(/\\[rc]/g, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  return { text, unknown }
}

/** What several sentences share: their common beginning and ending, with `{gap}` where they differ. */
export function sharedSentence(sentences: readonly string[], gap: string): string | undefined {
  const [first, ...rest] = sentences
  if (first === undefined || rest.length === 0) return undefined
  let start = first.length
  let end = first.length
  for (const other of rest) {
    let same = 0
    while (same < start && same < other.length && first[same] === other[same]) same++
    start = same
    let tail = 0
    while (tail < end && tail < other.length - start && first[first.length - 1 - tail] === other[other.length - 1 - tail]) tail++
    end = tail
  }
  if (start + end >= first.length) return undefined
  return `${first.slice(0, start)}{${gap}}${first.slice(first.length - end)}`
}

/** French keeps its two-part punctuation with the word before it: the space there must not end a line. */
export function unbroken(french: string): string {
  return french.replace(/ ([!?:;])/g, '\u00a0$1')
}

export interface BattleText {
  /** Where the texts come from: the commit of the source they were read at. */
  source: string
  messages: Record<string, Localized>
}

/** Reads the pinned lines and builds every mapped message. Lists what is missing or cannot be read. */
export async function buildBattleText(lock: BattleTextLock): Promise<{ battleText: BattleText; problems: string[] }> {
  const problems: string[] = []
  const mapping = await readJson<Mapping>(MAPPING)
  const [ids, en, fr] = await Promise.all(Object.values(FILES).map(async (file) => (await readFile(cachePath(lock, file), 'utf8')).split('\n')))
  if (!ids || !en || !fr || ids.length !== en.length || ids.length !== fr.length) return { battleText: { source: lock.commit, messages: {} }, problems: ['The battle text files do not have the same number of lines'] }
  const lineOf = new Map(ids.map((id, index) => [id, index]))

  const sentence = (id: string, key: string): Localized | undefined => {
    const index = lineOf.get(id)
    if (index === undefined) {
      problems.push(`Battle message "${key}": the source has no line ${id}`)
      return undefined
    }
    const made = { en: sentenceOf(en[index] ?? ''), fr: sentenceOf(fr[index] ?? '') }
    for (const language of ['en', 'fr'] as const) {
      if (made[language].unknown.length) problems.push(`Battle message "${key}" (${language}): variables this build cannot read: ${made[language].unknown.join(' ')}`)
      if (made[language].text === '') problems.push(`Battle message "${key}" (${language}) is empty in the source`)
    }
    return { en: made.en.text, fr: unbroken(made.fr.text) }
  }

  const messages: Record<string, Localized> = {}
  for (const [key, id] of Object.entries(mapping.messages)) {
    const made = sentence(id, key)
    if (made) messages[key] = made
  }
  const announced = mapping.moveUsed.flatMap((id) => sentence(id, 'moveUsed') ?? [])
  const used = { en: sharedSentence(announced.map((line) => line.en), 'move'), fr: sharedSentence(announced.map((line) => line.fr), 'move') }
  if (used.en && used.fr) messages.moveUsed = { en: used.en, fr: used.fr }
  else problems.push('Battle message "moveUsed": the lines that announce a move share no sentence')
  return { battleText: { source: lock.commit, messages }, problems }
}
