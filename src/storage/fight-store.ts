/**
 * The fight a game master's device keeps, so that it survives the page
 * closing (spec section 7: the unfinished battle is saved): the table around
 * the fight and the engine's own state, one fight per campaign. Written after
 * everything that changes the fight; forgotten once the encounter is over.
 *
 * Like the rest of the browser's storage it is a convenience. What is read
 * back is checked for being a kept fight at all; whether the engine can still
 * play it is the engine's to say (decision 139).
 */
import { z } from 'zod'
import { documentId } from '../shared/schema/common.ts'
import type { KeyValue } from './library.ts'

const FIGHTS = 'denborn/fight/'
/** The form of what is kept here. A device that kept another form keeps nothing this app can read. */
const FORM = 1

const kept = z.object({
  form: z.literal(FORM),
  /** The table's own state, read back as it was written. */
  fight: z.looseObject({ encounter: z.object({ id: documentId, name: z.string().min(1).max(60) }), round: z.number().int().min(1) }),
  /** The engine's state, with the versions that wrote it. */
  battle: z.object({ engine: z.string().max(40), adapter: z.number().int(), format: z.string().max(40), cursor: z.number().int().min(0), state: z.unknown() }),
})

export type StoredFight = Omit<z.infer<typeof kept>, 'form'>

export interface FightStore {
  /** The fight kept for a campaign, when there is one this app can read. */
  fightOf(campaignId: string): StoredFight | undefined
  /** Keeps a campaign's fight in the place of the one before. False when the device refuses: the fight then lasts as long as the page. */
  keep(campaignId: string, fight: { fight: object; battle: object }): boolean
  forget(campaignId: string): void
}

export function openFightStore(storage: KeyValue): FightStore {
  return {
    fightOf: (campaignId) => {
      try {
        const parsed = kept.safeParse(JSON.parse(storage.getItem(FIGHTS + campaignId) ?? 'null'))
        return parsed.success ? { fight: parsed.data.fight, battle: parsed.data.battle } : undefined
      } catch {
        // Not JSON any more, or a storage that refuses to be read: the same as no fight kept.
        return undefined
      }
    },
    keep: (campaignId, fight) => {
      try {
        storage.setItem(FIGHTS + campaignId, JSON.stringify({ form: FORM, ...fight }))
        return true
      } catch {
        // Full, or refused: said by the caller, who still has the fight in hand.
        return false
      }
    },
    forget: (campaignId) => {
      try {
        storage.removeItem(FIGHTS + campaignId)
      } catch {
        // A storage that refuses to be touched kept nothing either.
      }
    },
  }
}
