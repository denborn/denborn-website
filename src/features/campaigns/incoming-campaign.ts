/**
 * A campaign coming in from its file (decision 117): read, checked against
 * this app's game data, and set against the copy this device may already
 * keep. Nothing here keeps it: the screen asks first, as for a character.
 */
import type { DataPack } from '../../data/types.ts'
import { checkRules, isRulesHistoryInOrder } from '../../domain/rules-check.ts'
import { sameValue } from '../../shared/same-value.ts'
import type { CampaignDocument } from '../../shared/schema/campaign.ts'
import { openFile } from '../../storage/files.ts'
import type { Stored } from '../../storage/library.ts'
import { type Standing, standingOf } from '../import/standing.ts'

export type CampaignProblem =
  /** Not a file of Denborn's. */
  | 'notACampaign'
  /** A character's file. */
  | 'characterFile'
  | 'tooLarge'
  /** A campaign's file that is not well formed, or whose rules versions do not run 1, 2, 3… */
  | 'damaged'
  /** Made by a newer version of the app. */
  | 'newer'
  /** Some version of its rules names what this app's game data does not have. */
  | 'invalid'

export interface IncomingCampaign {
  ok: true
  campaign: CampaignDocument
  /** True when it was saved with other game data than this app's. */
  otherGameData: boolean
  standing: Standing
  /** The copy kept here, when there is one that can be read. */
  kept?: CampaignDocument
}

export type IncomingCampaignResult = IncomingCampaign | { ok: false; problem: CampaignProblem }

const problem = (reason: CampaignProblem): IncomingCampaignResult => ({ ok: false, problem: reason })

export function readIncomingCampaign(text: string, pack: DataPack, keptHere: readonly Stored<CampaignDocument>[]): IncomingCampaignResult {
  const file = openFile(text)
  if (file.kind === 'character') return problem('characterFile')
  if (file.kind === 'unknown') return problem(file.reason === 'too-large' ? 'tooLarge' : 'notACampaign')
  if (!file.read.ok) return problem(file.read.reason === 'newer-version' ? 'newer' : 'damaged')
  const campaign = file.read.value
  if (!isRulesHistoryInOrder(campaign.rulesHistory)) return problem('damaged')
  // Every version must stand: characters kept elsewhere may still be checked against an old one.
  if (campaign.rulesHistory.some((rules) => checkRules(rules, pack).length > 0)) return problem('invalid')
  const entry = keptHere.find((stored) => stored.id === campaign.id)
  const kept = entry?.read.ok ? entry.read.value : undefined
  return { ok: true, campaign, otherGameData: campaign.dataPackVersion !== pack.version, standing: standingOf(campaign, entry, sameValue), ...(kept ? { kept } : {}) }
}
