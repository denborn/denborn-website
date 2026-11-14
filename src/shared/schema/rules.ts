/**
 * A campaign's rules, as the GM sets them (DECISIONS.md 1.1, "Campaign
 * rules"). Changing any rule makes a new version; characters keep the version
 * they were made under.
 */
import { z } from 'zod'
import type { MoveAccess } from '../../game-rules/eligibility.ts'
import { dataId, itemStack, whole } from './common.ts'

export const STARTING_MONEY_MAX = 9_999_999

/** A set of items a player may start with: the player picks one pack at creation. */
export const itemPack = z.object({
  name: z.string().min(1).max(40),
  items: z.array(itemStack).max(100),
})

export type ItemPack = z.infer<typeof itemPack>

export const campaignRules = z.object({
  /** 1 for a campaign's first rules, one more at every change. */
  version: whole(1, 9999),
  /** The species players may create. All of the data pack's by default. */
  species: z.array(dataId).min(1).max(2000),
  startingLevel: whole(1, 100),
  startingMoney: whole(0, STARTING_MONEY_MAX),
  /** Each player chooses a nature, or every Pokémon is neutral. The GM must choose: there is no default. */
  natures: z.enum(['chosen', 'neutral']),
  /** Level-up moves only, or those plus TM, tutor and egg moves. No default either. */
  moveAccess: z.enum(['level-up', 'level-up-tm-tutor-egg']) satisfies z.ZodType<MoveAccess>,
  /** Moves the GM makes available to everyone, whatever their species. */
  commonMoves: z.array(dataId).max(1000),
  itemPacks: z.array(itemPack).min(1).max(50),
})

export type CampaignRules = z.infer<typeof campaignRules>
