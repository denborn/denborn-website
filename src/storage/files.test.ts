import { describe, expect, it } from 'vitest'
import { newcomer, testRules } from '../domain/test-pack'
import type { CampaignDocument } from '../shared/schema/campaign'
import { MAX_FILE_LENGTH, campaignFile, characterFile, fileSlug, openFile, storedCharacterFile } from './files'

const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 4, dataPackVersion: 'test-pack', name: 'Les Égarés', rulesHistory: [testRules()], characters: [], encounters: [] }

describe('a character file', () => {
  it('carries the character and the rules it was made under, and reads back', () => {
    const file = characterFile(newcomer(), testRules())
    expect(openFile(file.text)).toEqual({ kind: 'character', read: { ok: true, value: { ...newcomer(), rules: testRules() } } })
  })

  it('is named after the character, in plain letters', () => {
    expect(characterFile(newcomer({ nickname: "Éclair-2 d'Été." }), testRules()).name).toBe('denborn-eclair-2-d-ete.json')
    // A name with nothing a file name can keep falls back on the id.
    expect(characterFile(newcomer({ nickname: "'.'" }), testRules()).name).toBe('denborn-character-0001.json')
  })
})

describe('the file of a kept character, as it is stored', () => {
  it('is the stored text untouched, named after the character when it can be read', () => {
    const raw = JSON.stringify({ ...newcomer({ nickname: 'Volt' }), somethingNewer: true })
    expect(storedCharacterFile({ id: 'character-0001', raw, read: { ok: true, value: newcomer({ nickname: 'Volt' }) } })).toEqual({ name: 'denborn-volt.json', text: raw })
  })

  it('is named after its id when the entry cannot be read', () => {
    expect(storedCharacterFile({ id: 'character-0001', raw: 'not json', read: { ok: false, reason: 'not-this-kind' } })).toEqual({ name: 'denborn-character-0001.json', text: 'not json' })
  })
})

describe('a campaign file', () => {
  it('carries the campaign and reads back', () => {
    const file = campaignFile(campaign)
    expect(file.name).toBe('denborn-campaign-les-egares.json')
    expect(openFile(file.text)).toEqual({ kind: 'campaign', read: { ok: true, value: campaign } })
  })
})

describe('opening a file', () => {
  it.each([
    ['text that is not JSON', 'hello', 'not-json'],
    ['JSON of something else', '{"name":"package"}', 'not-denborn'],
    ['a list', '[1,2,3]', 'not-denborn'],
    ['a file far too long', ' '.repeat(MAX_FILE_LENGTH + 1), 'too-large'],
  ])('says %s is not one of Denborn’s', (_, text, reason) => {
    expect(openFile(text)).toEqual({ kind: 'unknown', reason })
  })

  it('says which kind a file is even when it cannot be used', () => {
    const newer = JSON.stringify({ ...campaign, schemaVersion: 5 })
    expect(openFile(newer)).toEqual({ kind: 'campaign', read: { ok: false, reason: 'newer-version', found: 5 } })
    const broken = openFile(JSON.stringify({ ...newcomer(), level: 0 }))
    expect(broken.kind).toBe('character')
    expect(broken.kind === 'character' && !broken.read.ok && broken.read.reason).toBe('malformed')
  })
})

describe('a name for a file', () => {
  it.each([
    ['Mr. Mime', 'mr-mime'],
    ['Zoé', 'zoe'],
    ['  --Volt--  ', 'volt'],
    ['...', ''],
  ])('turns %j into %j', (name, slug) => {
    expect(fileSlug(name)).toBe(slug)
  })
})
