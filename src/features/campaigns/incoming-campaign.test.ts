import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { campaignFile, characterFile } from '../../storage/files'
import type { Stored } from '../../storage/library'
import { readIncomingCampaign } from './incoming-campaign'

const campaign = (changes: Partial<CampaignDocument> = {}): CampaignDocument => ({ kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 3, dataPackVersion: 'test-pack', name: 'Night Shift', rulesHistory: [testRules()], characters: [], encounters: [], ...changes })
const kept = (document: CampaignDocument): Stored<CampaignDocument> => ({ id: document.id, read: { ok: true, value: document }, raw: JSON.stringify(document) })
const read = (document: CampaignDocument, here: Stored<CampaignDocument>[] = []) => readIncomingCampaign(campaignFile(document).text, testPack, here)

describe('a campaign coming in from its file', () => {
  it('is read with every version of its rules', () => {
    const history = [testRules(), testRules({ version: 2, startingLevel: 30 })]
    expect(read(campaign({ rulesHistory: history }))).toMatchObject({ ok: true, standing: 'new', otherGameData: false, campaign: { rulesHistory: history } })
  })

  it('says what the file is when it is not a campaign', () => {
    expect(readIncomingCampaign(characterFile(newcomer(), testRules()).text, testPack, [])).toEqual({ ok: false, problem: 'characterFile' })
    expect(readIncomingCampaign('a holiday picture', testPack, [])).toEqual({ ok: false, problem: 'notACampaign' })
  })

  it('is refused when a version of its rules is missing, or names what the game data does not have', () => {
    expect(read(campaign({ rulesHistory: [testRules({ version: 2 })] }))).toEqual({ ok: false, problem: 'damaged' })
    expect(read(campaign({ rulesHistory: [testRules({ species: ['unknownmon'] }), testRules({ version: 2 })] }))).toEqual({ ok: false, problem: 'invalid' })
  })

  it('says so when it was saved with other game data', () => {
    expect(read(campaign({ dataPackVersion: 'older-pack' }))).toMatchObject({ ok: true, otherGameData: true })
  })
})

describe('a campaign already kept on this device', () => {
  it('is alike, more recent, older or changed apart, by how many times each was saved', () => {
    const here = [kept(campaign())]
    expect(read(campaign(), here)).toMatchObject({ standing: 'same' })
    expect(read(campaign({ revision: 4, name: 'Day Shift' }), here)).toMatchObject({ standing: 'newer', kept: { name: 'Night Shift' } })
    expect(read(campaign({ revision: 2, name: 'Day Shift' }), here)).toMatchObject({ standing: 'older' })
    expect(read(campaign({ name: 'Day Shift' }), here)).toMatchObject({ standing: 'differs' })
  })
})
