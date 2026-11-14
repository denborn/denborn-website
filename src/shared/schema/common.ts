/**
 * Building blocks of the saved documents' schemas.
 *
 * A schema checks shape and plain ranges only: what a document must look
 * like whatever the game data says. Whether a move exists, a species may have
 * an Ability or a budget is respected is checked in src/domain, against the
 * data pack and the campaign's rules.
 *
 * Every list has a largest size: a document read from a file, a link or a
 * QR code is untrusted, and must not be able to make the app do unbounded work.
 */
import { z } from 'zod'

/** An id of the data pack: Showdown's ids are lower-case letters and digits. */
export const dataId = z.string().regex(/^[a-z0-9]{1,40}$/)

/** The id of a campaign or a character: a UUID, or anything of that alphabet and size. */
export const documentId = z.string().regex(/^[A-Za-z0-9_-]{8,40}$/)

export const whole = (min: number, max: number) => z.number().int().min(min).max(max)

export const statSpread = (max: number) =>
  z.object({ hp: whole(0, max), atk: whole(0, max), def: whole(0, max), spa: whole(0, max), spd: whole(0, max), spe: whole(0, max) })

export const itemStack = z.object({ item: dataId, quantity: whole(1, 999) })

export type ItemStack = z.infer<typeof itemStack>

/** What reading a saved document gives: the document, or why it cannot be used. */
export type ReadResult<T> =
  | { ok: true; value: T }
  /** Not a document of this kind at all. */
  | { ok: false; reason: 'not-this-kind' }
  /** Written by a newer version of the app than this one. */
  | { ok: false; reason: 'newer-version'; found: number }
  /** Of this kind, but malformed: where and what. */
  | { ok: false; reason: 'malformed'; issues: string[] }

/**
 * Reads an untrusted value as a document of one kind. A document says what it
 * is (`kind`) and which version of its format it is in (`schemaVersion`): a
 * newer one is refused rather than half-understood, and an older one will be
 * brought up to date here before it is checked, once there is one.
 */
export function readDocument<T>(schema: z.ZodType<T>, kind: string, version: number, input: unknown): ReadResult<T> {
  if (typeof input !== 'object' || input === null) return { ok: false, reason: 'not-this-kind' }
  const header = input as { kind?: unknown; schemaVersion?: unknown }
  if (header.kind !== kind || typeof header.schemaVersion !== 'number') return { ok: false, reason: 'not-this-kind' }
  if (header.schemaVersion > version) return { ok: false, reason: 'newer-version', found: header.schemaVersion }
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, value: parsed.data }
  return { ok: false, reason: 'malformed', issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }
}
