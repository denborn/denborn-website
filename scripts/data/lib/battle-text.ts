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
const ITEM_GRAMMAR = join(ROOT, 'data-sources/item-grammar.json')

export interface BattleTextLock {
  repository: string
  commit: string
  committedAt: string
  path: string
  licence: string
  /** SHA-256 of each file, by file name. */
  files: Record<string, string>
}

/** Which Pokémon a variable of a line names: the one the engine's line is about, the one it came from, the one it is aimed at. */
export type Who = 'pokemon' | 'source' | 'target'

interface Mapping {
  /** Lines that announce a move, one per move: the sentence is what they share around the move's name. */
  moveUsed: string[]
  /**
   * Our name for a message, and the id of the line that says it. With `who`,
   * the line's Pokémon variables, in the order of their numbers, are named by
   * what each is to the engine's line; without, by their numbers.
   */
  messages: Record<string, string | { line: string; who: Who[] }>
  /** What can be in effect during a fight, by the engine's id: the number of the lines that name it and say what it does. */
  states: Record<string, number>
}

export type Localized = { en: string; fr: string }

/** A French noun's gender and number: what its article and what is said of it agree with. */
export type Grammar = 'm' | 'f' | 'mp' | 'fp'
const GRAMMARS: readonly string[] = ['m', 'f', 'mp', 'fp']

interface ItemGrammar {
  /** The gender and number of each held item's French name, by the item's id. The games' text does not carry them: this table is ours. */
  fr: Record<string, string>
}

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
const GAPS: Record<string, string> = { '0101': 'pokemon', '0102': 'pokemon', '0103': 'type', '0106': 'ability', '0107': 'move', '0109': 'item', '010A': 'item', '0200': 'number', '0201': 'number' }
/** Variables that only style the text, or mark where a sentence starts: nothing to say. */
const SILENT = new Set(['BD06', 'FF00'])
/** French "de" before a name, which the games elide before a vowel: left as a gap for the app to settle once it knows the name. */
const DE = '1408'
/** French articles before an item's name, which agree with it: gaps too, for the app knows the item. */
const ARTICLES: Record<string, string> = { '1400': 'le', '1401': 'Le', '1402': 'un', '1404': 'au', '1406': 'du' }
/**
 * Variables after which the text comes in several forms, one of which is said:
 * by a number being one or several, by an item's gender, its number, or both.
 * For each, which of the forms that follow is for a masculine singular, a
 * feminine singular, a masculine plural and a feminine plural.
 */
const FORMS: Record<string, readonly [number, number, number, number]> = { '1100': [0, 1, 0, 1], '1101': [0, 0, 1, 1], '1102': [0, 1, 2, 3] }
const NUMBER_FORMS = '1101'

const VARIABLE = /\[VAR ([0-9A-F]{4})(?:\(([0-9A-F,]*)\))?\]/g
const numberOf = (hex: string | undefined): number => parseInt(hex ?? '0', 16)

/**
 * A line of the games' text as a sentence with named gaps: `{pokemon0}`,
 * `{move}`, `{de}` where French says "de" or "d’" before the name that
 * follows, `{le}` and its like where an article agrees with an item, and
 * `{number:time|times}` or `{item:…|…|…|…}` where the text itself changes with
 * a number or with an item's gender and number. With `who`, the Pokémon are
 * named by what they are to the engine's line (`{pokemon0}`, `{source}`,
 * `{target}`). Lists the variables it could not turn into a gap.
 */
export function sentenceOf(line: string, who?: readonly Who[]): { text: string; unknown: string[] } {
  const unknown: string[] = []
  // A line break counts for one character, as it does where the games measure the forms of a text.
  const raw = line.replace(/\\n/g, '\n').replace(/\\[rc]/g, '')
  /** What each variable stands for, by its number among the line's arguments. */
  const kinds = new Map<number, string>()
  for (const [, code = '', list] of raw.matchAll(VARIABLE)) {
    const kind = GAPS[code]
    if (kind) kinds.set(numberOf(list?.split(',')[0]), kind)
  }
  const pokemon = [...kinds].filter(([, kind]) => kind === 'pokemon').map(([number]) => number).sort((a, b) => a - b)
  if (who && who.length !== pokemon.length) unknown.push(`${who.length} Pokémon named for ${pokemon.length} in the line`)
  const pokemonGap = (number: number): string => {
    const named = who?.[pokemon.indexOf(number)]
    return named === undefined ? `pokemon${number}` : named === 'pokemon' ? 'pokemon0' : named
  }

  let text = ''
  let at = 0
  for (const match of raw.matchAll(VARIABLE)) {
    const [whole, code = '', list = ''] = match
    // The forms of a text are measured in characters: a variable among them cannot be read.
    if (match.index < at) {
      unknown.push(`${whole} inside the forms of another variable`)
      continue
    }
    text += raw.slice(at, match.index)
    at = match.index + whole.length
    const [first, ...pairs] = list.split(',')
    const about = kinds.get(numberOf(first))
    const article = ARTICLES[code]
    const order = FORMS[code]
    if (SILENT.has(code)) continue
    if (code === DE) text += '{de}'
    else if (article && about === 'item') text += `{${article}}`
    else if (order) {
      // Each pair of lengths is written last form first.
      const forms = pairs
        .flatMap((pair) => [numberOf(pair.slice(2)), numberOf(pair.slice(0, 2))])
        .map((length) => {
          const form = raw.slice(at, at + length)
          at += length
          return form
        })
      if (about === 'number' && code === NUMBER_FORMS) text += `{number:${forms.join('|')}}`
      else if (about === 'item') text += `{item:${order.map((form) => forms[form] ?? '').join('|')}}`
      else unknown.push(whole)
    } else if (GAPS[code] === 'pokemon') text += `{${pokemonGap(numberOf(first))}}`
    else if (GAPS[code]) text += `{${GAPS[code]}}`
    else {
      unknown.push(whole)
      text += whole
    }
  }
  text += raw.slice(at)
  // An article stands right before the item it agrees with, and a sentence names one move, one item, one of each thing.
  if (/\{(?:le|Le|un|au|du)\}(?!\{item\})/.test(text)) unknown.push('an article away from its item')
  for (const gap of ['move', 'item', 'ability', 'type', 'number']) if (text.split(`{${gap}}`).length > 2) unknown.push(`two gaps for one ${gap}`)
  // Line breaks and the marks that end a text box are the games' layout, not ours.
  return { text: text.replace(/\n/g, ' ').replace(/ {2,}/g, ' ').trim(), unknown }
}

/** What a sentence names: the gaps that take a name or a number, whatever form they are written in. */
export function namedIn(sentence: string): Set<string> {
  return new Set([...sentence.matchAll(/\{(pokemon\d+|source|target|move|item|ability|type|number)[:}]/g)].map(([, gap = '']) => gap))
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
  /** The games' name for each thing that can be in effect, and what it says it does, by the engine's id. */
  states: Record<string, { name: Localized; text: Localized }>
  /** The gender and number of each held item's French name, for the articles of the French sentences. */
  itemGrammar: Record<string, Grammar>
}

/** The grammar of every held item's French name: each must have one, and the table names no item the game data lacks. */
export function itemGrammarOf(table: Record<string, string>, heldItems: readonly string[]): { itemGrammar: Record<string, Grammar>; problems: string[] } {
  const problems: string[] = []
  const itemGrammar: Record<string, Grammar> = {}
  const isGrammar = (value: string | undefined): value is Grammar => value !== undefined && GRAMMARS.includes(value)
  for (const item of heldItems) {
    const grammar = table[item]
    if (isGrammar(grammar)) itemGrammar[item] = grammar
    else problems.push(`Held item "${item}" has no French gender and number in ${ITEM_GRAMMAR} (m, f, mp or fp)`)
  }
  const held = new Set(heldItems)
  for (const item of Object.keys(table)) if (!held.has(item)) problems.push(`${ITEM_GRAMMAR} names "${item}", which is not a held item of the game data`)
  return { itemGrammar, problems }
}

/** Reads the pinned lines and builds every mapped message. Lists what is missing or cannot be read. */
export async function buildBattleText(lock: BattleTextLock, heldItems: readonly string[]): Promise<{ battleText: BattleText; problems: string[] }> {
  const mapping = await readJson<Mapping>(MAPPING)
  const { itemGrammar, problems } = itemGrammarOf((await readJson<ItemGrammar>(ITEM_GRAMMAR)).fr, heldItems)
  const [ids, en, fr] = await Promise.all(Object.values(FILES).map(async (file) => (await readFile(cachePath(lock, file), 'utf8')).split('\n')))
  if (!ids || !en || !fr || ids.length !== en.length || ids.length !== fr.length) return { battleText: { source: lock.commit, messages: {}, states: {}, itemGrammar }, problems: ['The battle text files do not have the same number of lines'] }
  const lineOf = new Map(ids.map((id, index) => [id, index]))

  const sentence = (id: string, key: string, who?: readonly Who[]): Localized | undefined => {
    const index = lineOf.get(id)
    if (index === undefined) {
      problems.push(`Battle message "${key}": the source has no line ${id}`)
      return undefined
    }
    const made = { en: sentenceOf(en[index] ?? '', who), fr: sentenceOf(fr[index] ?? '', who) }
    for (const language of ['en', 'fr'] as const) {
      if (made[language].unknown.length) problems.push(`Battle message "${key}" (${language}): variables this build cannot read: ${made[language].unknown.join(' ')}`)
      if (made[language].text === '') problems.push(`Battle message "${key}" (${language}) is empty in the source`)
    }
    // The English sentence is the one the engine's line was paired with: the French one may not name more than it does.
    const named = namedIn(made.en.text)
    const more = [...namedIn(made.fr.text)].filter((gap) => !named.has(gap))
    if (more.length) problems.push(`Battle message "${key}": the French sentence names what the English one does not: ${more.join(', ')}`)
    return { en: made.en.text, fr: unbroken(made.fr.text) }
  }

  const messages: Record<string, Localized> = {}
  for (const [key, mapped] of Object.entries(mapping.messages)) {
    const made = typeof mapped === 'string' ? sentence(mapped, key) : sentence(mapped.line, key, mapped.who)
    if (made) messages[key] = made
  }
  const announced = mapping.moveUsed.flatMap((id) => sentence(id, 'move') ?? [])
  const used = { en: sharedSentence(announced.map((line) => line.en), 'move'), fr: sharedSentence(announced.map((line) => line.fr), 'move') }
  if (used.en && used.fr) messages.move = { en: used.en, fr: used.fr }
  else problems.push('Battle message "move": the lines that announce a move share no sentence')

  const states: BattleText['states'] = {}
  for (const [effect, number] of Object.entries(mapping.states)) {
    const line = `sv.btl_state.BTR_STATE_${String(number).padStart(2, '0')}`
    const name = sentence(`${line}_01`, `state ${effect} (name)`)
    const text = sentence(`${line}_02`, `state ${effect} (description)`)
    if (name && text) states[effect] = { name, text }
  }
  return { battleText: { source: lock.commit, messages, states, itemGrammar }, problems }
}
