/**
 * A campaign, as the GM keeps it (spec section 8). For now: its name, the
 * history of its rules, the characters that joined it and the encounters
 * prepared for it. The battle in progress joins it with milestone 6.
 */
import { z } from 'zod'
import { type ReadResult, documentId, readDocument, whole } from './common.ts'
import { characterDocument } from './character.ts'
import { encounter } from './encounter.ts'
import { campaignRules } from './rules.ts'

export const CAMPAIGN_KIND = 'denborn.campaign'
export const CAMPAIGN_SCHEMA_VERSION = 1

export const campaignDocument = z.object({
  kind: z.literal(CAMPAIGN_KIND),
  schemaVersion: z.literal(CAMPAIGN_SCHEMA_VERSION),
  id: documentId,
  revision: whole(0, 1_000_000_000),
  dataPackVersion: z.string().min(1).max(80),
  name: z.string().min(1).max(60),
  /** Every version of the rules, oldest first; the last one is in force. */
  rulesHistory: z.array(campaignRules).min(1).max(9999),
  /**
   * The game master's own copy of every character that joined a session of
   * the campaign (spec section 5), each without the rules it carries
   * elsewhere: the campaign has them. A campaign saved before sessions
   * existed has none.
   */
  characters: z.array(characterDocument).max(200).default([]),
  /** The encounters the game master prepared. A campaign saved before encounters existed has none. */
  encounters: z.array(encounter).max(200).default([]),
})

export type CampaignDocument = z.infer<typeof campaignDocument>

export function readCampaign(input: unknown): ReadResult<CampaignDocument> {
  return readDocument(campaignDocument, CAMPAIGN_KIND, CAMPAIGN_SCHEMA_VERSION, input)
}
