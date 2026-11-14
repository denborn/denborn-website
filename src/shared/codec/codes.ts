/**
 * The two codes of Denborn (DECISIONS.md 2.1; spec sections 3 and 5).
 *
 * A **creation code** carries a campaign's identity and its rules: it is the
 * end of the link a GM sends, and lets a player create a character with the
 * GM offline. A **character code** carries a whole character, but only names
 * its campaign and rules version; it is what a QR code holds.
 *
 * A code is a tag, a format number, a dot, then the packed fields in a fixed
 * order: "dnr1.…" for rules, "dnc1.…" for a character. In a QR code the same
 * code is written in capitals ("DNC1.…", see `qrForm`), which QR codes store
 * more densely; both forms are read alike. Reading one never
 * trusts it: it is unpacked within a size limit, rebuilt, then passed through
 * the same schema as a file. Whether its content obeys the rules and the game
 * data is the business of src/domain, as for any document.
 */
import { z } from 'zod'
import { CHARACTER_KIND, CHARACTER_SCHEMA_VERSION, type CharacterDocument, characterDocument } from '../schema/character.ts'
import { documentId } from '../schema/common.ts'
import { type CampaignRules, campaignRules } from '../schema/rules.ts'
import { fromBase32, fromBase64Url, pack, toBase32, unpackBytes } from './packing.ts'
import { maskToNumbers, numbersToMask } from './species-mask.ts'

const FORMAT = 1
const RULES_TAG = 'dnr'
const CHARACTER_TAG = 'dnc'
/** Longest code read, in characters, and the most it may inflate to, in bytes. */
const MAX_CODE_LENGTH = 200_000
const MAX_INFLATED = 400_000

export type CodeResult<T> =
  | { ok: true; value: T }
  /** Not a code of this kind. */
  | { ok: false; reason: 'not-this-kind' }
  /** Made by a newer version of the app. */
  | { ok: false; reason: 'newer-version' }
  /** Cut short, mistyped or otherwise unreadable. */
  | { ok: false; reason: 'damaged' }
  /** Readable, but names a species this app's game data does not have. */
  | { ok: false; reason: 'unknown-species'; number: number }

/** What a creation code carries: enough to create a character for a campaign. */
export const invitation = z.object({
  campaign: z.object({ id: documentId, name: z.string().min(1).max(60) }),
  dataPackVersion: z.string().min(1).max(80),
  rules: campaignRules,
})

export type Invitation = z.infer<typeof invitation>

/** The species a code needs to know: each one's id and National Pokédex number. */
export type SpeciesIndex = Readonly<Record<string, { id: string; num: number }>>

/**
 * The fields of a code as a list, or why the text is not such a code. The
 * text may be the code alone or a link that ends with it after a "#", as a
 * scanned QR code or a pasted link gives.
 */
function open(text: string, tag: string): CodeResult<unknown[]> {
  if (text.length > MAX_CODE_LENGTH) return { ok: false, reason: 'damaged' }
  const trimmed = text.trim()
  const code = trimmed.slice(trimmed.lastIndexOf('#') + 1)
  const match = /^([a-z]+|[A-Z]+)(\d+)\.(.*)$/s.exec(code)
  if (!match || match[1]?.toLowerCase() !== tag) return { ok: false, reason: 'not-this-kind' }
  if (Number(match[2]) > FORMAT) return { ok: false, reason: 'newer-version' }
  // A tag in capitals marks the QR form, whose payload is in base 32.
  const payload = match[3] ?? ''
  const bytes = match[1] === tag ? fromBase64Url(payload) : fromBase32(payload)
  const fields = unpackBytes(bytes, MAX_INFLATED)
  return Array.isArray(fields) ? { ok: true, value: fields as unknown[] } : { ok: false, reason: 'damaged' }
}

/**
 * A code as a QR code should hold it: in capitals and digits only, which a
 * QR code stores about a fifth more densely than mixed case. With `origin`,
 * it is a link to the app that ends with the code, so that any camera app
 * can open it.
 */
export function qrForm(code: string, origin = ''): string {
  const match = /^([a-z]+\d+)\.(.*)$/s.exec(code)
  const bytes = match ? fromBase64Url(match[2] ?? '') : undefined
  if (!match || !bytes) throw new Error('Not a code')
  const capitals = `${(match[1] ?? '').toUpperCase()}.${toBase32(bytes)}`
  return origin ? `${origin}/#${capitals}` : capitals
}

// ---------------------------------------------------------------------------
// Creation code
// ---------------------------------------------------------------------------

const NATURES = ['chosen', 'neutral'] as const
const MOVE_ACCESS = ['level-up', 'level-up-tm-tutor-egg'] as const

function rulesToFields(rules: CampaignRules, species: SpeciesIndex): unknown[] {
  const numbers = rules.species.map((id) => species[id]?.num ?? 0).filter((number) => number > 0)
  return [
    rules.version,
    numbersToMask(numbers),
    rules.startingLevel,
    rules.startingMoney,
    NATURES.indexOf(rules.natures),
    MOVE_ACCESS.indexOf(rules.moveAccess),
    rules.commonMoves,
    rules.itemPacks.map((itemPack) => [itemPack.name, itemPack.items.map((stack) => [stack.item, stack.quantity])]),
  ]
}

/**
 * Rebuilds rules from their fields, or names the first species number this
 * app's data does not have. Shapes are not checked here: the schema does it
 * afterwards, so a wrong field simply ends as a damaged code.
 */
function fieldsToRules(fields: unknown, species: SpeciesIndex): { rules: unknown } | { unknownSpecies: number } {
  if (!Array.isArray(fields)) return { rules: undefined }
  const [version, mask, startingLevel, startingMoney, natures, moveAccess, commonMoves, itemPacks] = fields as unknown[]
  const numbers = typeof mask === 'string' ? maskToNumbers(mask) : undefined
  if (!numbers) return { rules: undefined }
  const byNumber = new Map(Object.values(species).map((entry) => [entry.num, entry.id]))
  const unknown = numbers.find((number) => !byNumber.has(number))
  if (unknown !== undefined) return { unknownSpecies: unknown }
  const rules = {
    version,
    species: numbers.map((number) => byNumber.get(number)),
    startingLevel,
    startingMoney,
    natures: NATURES[natures as number],
    moveAccess: MOVE_ACCESS[moveAccess as number],
    commonMoves,
    itemPacks: Array.isArray(itemPacks)
      ? (itemPacks as unknown[]).map((entry) => {
          const [name, items] = Array.isArray(entry) ? (entry as unknown[]) : []
          return { name, items: Array.isArray(items) ? (items as unknown[]).map((stack) => stackOf(stack)) : items }
        })
      : itemPacks,
  }
  return { rules }
}

function stackOf(fields: unknown): unknown {
  const [item, quantity] = Array.isArray(fields) ? (fields as unknown[]) : []
  return { item, quantity }
}

export function encodeCreationCode(invite: Invitation, species: SpeciesIndex): string {
  return `${RULES_TAG}${FORMAT}.${pack([invite.dataPackVersion, invite.campaign.id, invite.campaign.name, rulesToFields(invite.rules, species)])}`
}

export function decodeCreationCode(text: string, species: SpeciesIndex): CodeResult<Invitation> {
  const opened = open(text, RULES_TAG)
  if (!opened.ok) return opened
  const [dataPackVersion, id, name, rulesFields] = opened.value
  const rebuilt = fieldsToRules(rulesFields, species)
  if ('unknownSpecies' in rebuilt) return { ok: false, reason: 'unknown-species', number: rebuilt.unknownSpecies }
  const parsed = invitation.safeParse({ campaign: { id, name }, dataPackVersion, rules: rebuilt.rules })
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: 'damaged' }
}

// ---------------------------------------------------------------------------
// Character code
// ---------------------------------------------------------------------------

const GENDERS = ['M', 'F', 'N'] as const
const ATTRIBUTES = ['strength', 'dexterity', 'endurance', 'perception', 'charisma', 'intelligence'] as const
const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const

const listOf = <K extends string>(keys: readonly K[], values: Record<K, number>): number[] => keys.map((key) => values[key])
const recordOf = (keys: readonly string[], values: unknown): unknown =>
  Array.isArray(values) ? Object.fromEntries(keys.map((key, index) => [key, (values as unknown[])[index]])) : values

/** The whole character, without the rules a file would carry: a code only names them. */
export function encodeCharacterCode(character: CharacterDocument): string {
  const condition = character.condition
  return `${CHARACTER_TAG}${FORMAT}.${pack([
    character.id,
    character.revision,
    character.dataPackVersion,
    character.campaign.id,
    character.campaign.name,
    character.campaign.rulesVersion,
    character.species,
    character.nickname,
    GENDERS.indexOf(character.gender),
    character.level,
    character.exp,
    character.nature ?? 0,
    character.ability,
    listOf(ATTRIBUTES, character.attributes.creation),
    listOf(ATTRIBUTES, character.attributes.gained),
    listOf(STATS, character.ivs),
    listOf(STATS, character.evs),
    character.moves.map((slot) => [slot.id, slot.ppUps, slot.pp]),
    character.heldItem ?? 0,
    character.bag.map((stack) => [stack.item, stack.quantity]),
    character.money,
    character.hp,
    character.status ?? 0,
    condition.state === 'standing' ? 0 : condition.state === 'dead' ? -1 : condition.stacks,
  ])}`
}

export function decodeCharacterCode(text: string): CodeResult<CharacterDocument> {
  const opened = open(text, CHARACTER_TAG)
  if (!opened.ok) return opened
  const [
    id,
    revision,
    dataPackVersion,
    campaignId,
    campaignName,
    rulesVersion,
    species,
    nickname,
    gender,
    level,
    exp,
    nature,
    ability,
    creation,
    gained,
    ivs,
    evs,
    moves,
    heldItem,
    bag,
    money,
    hp,
    status,
    condition,
  ] = opened.value
  const absent = (value: unknown): unknown => (value === 0 ? undefined : value)
  const parsed = characterDocument.safeParse({
    kind: CHARACTER_KIND,
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    id,
    revision,
    dataPackVersion,
    campaign: { id: campaignId, name: campaignName, rulesVersion },
    species,
    nickname,
    gender: GENDERS[gender as number],
    level,
    exp,
    nature: absent(nature),
    ability,
    attributes: { creation: recordOf(ATTRIBUTES, creation), gained: recordOf(ATTRIBUTES, gained) },
    ivs: recordOf(STATS, ivs),
    evs: recordOf(STATS, evs),
    moves: Array.isArray(moves)
      ? (moves as unknown[]).map((slot) => {
          const [move, ppUps, pp] = Array.isArray(slot) ? (slot as unknown[]) : []
          return { id: move, ppUps, pp }
        })
      : moves,
    heldItem: absent(heldItem),
    bag: Array.isArray(bag) ? (bag as unknown[]).map((stack) => stackOf(stack)) : bag,
    money,
    hp,
    status: absent(status),
    condition: condition === 0 ? { state: 'standing' } : condition === -1 ? { state: 'dead' } : { state: 'downed', stacks: condition },
  })
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: 'damaged' }
}
