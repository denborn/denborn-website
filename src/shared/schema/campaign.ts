/**
 * A campaign, as the GM keeps it (spec section 8). For now: its name and the
 * history of its rules. The registered characters, the encounters and the
 * battle in progress join it with the milestones that build them.
 */
import { z } from 'zod'
import { type ReadResult, documentId, readDocument, whole } from './common.ts'
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
})

export type CampaignDocument = z.infer<typeof campaignDocument>

export function readCampaign(input: unknown): ReadResult<CampaignDocument> {
  return readDocument(campaignDocument, CAMPAIGN_KIND, CAMPAIGN_SCHEMA_VERSION, input)
}
