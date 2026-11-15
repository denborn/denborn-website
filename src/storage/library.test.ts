import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../domain/test-pack'
import type { Invitation } from '../shared/codec/codes'
import type { CampaignDocument } from '../shared/schema/campaign'
import { newId } from './ids'
import { type KeyValue, openLibrary } from './library'

/** A stand-in for the browser's storage, which can be made to run out of room or to refuse access. */
function memory(options: { room?: number; refuses?: boolean } = {}): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    get length() {
      return data.size
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => {
      if (options.refuses) throw Object.assign(new Error('refused'), { name: 'SecurityError' })
      const used = [...data].reduce((total, [other, text]) => total + (other === key ? 0 : text.length), 0)
      if (used + value.length > (options.room ?? Infinity)) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' })
      data.set(key, value)
    },
  }
}

const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [testRules()], characters: [] }
const invite = (version: number): Invitation => ({ campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules({ version }) })

describe('the documents kept on a device', () => {
  it('keeps characters and campaigns and gives them back', () => {
    const library = openLibrary(memory())
    expect(library.saveCharacter(newcomer())).toEqual({ ok: true })
    expect(library.saveCharacter(newcomer({ id: 'character-0002', nickname: 'Roc' }))).toEqual({ ok: true })
    expect(library.saveCampaign(campaign)).toEqual({ ok: true })
    expect(library.characters().map((entry) => entry.read.ok && entry.read.value.nickname)).toEqual(['Volt', 'Roc'])
    expect(library.campaigns().map((entry) => entry.id)).toEqual(['campaign-0001'])
  })

  it('replaces a document saved again under the same id', () => {
    const library = openLibrary(memory())
    library.saveCharacter(newcomer())
    library.saveCharacter(newcomer({ revision: 1, money: 900 }))
    const kept = library.characters()
    expect(kept).toHaveLength(1)
    expect(kept[0]?.read.ok && kept[0].read.value.money).toBe(900)
  })

  it('removes one document and leaves the others', () => {
    const library = openLibrary(memory())
    library.saveCharacter(newcomer())
    library.saveCharacter(newcomer({ id: 'character-0002' }))
    library.removeCharacter('character-0001')
    expect(library.characters().map((entry) => entry.id)).toEqual(['character-0002'])
  })

  it('leaves alone what else the site keeps in the same storage', () => {
    const storage = memory()
    storage.setItem('denborn/language', 'fr')
    const library = openLibrary(storage)
    expect(library.characters()).toEqual([])
    expect(library.campaigns()).toEqual([])
  })

  it('lists an entry it cannot read as such, with its text, and still lists the others', () => {
    const storage = memory()
    const library = openLibrary(storage)
    library.saveCharacter(newcomer())
    storage.setItem('denborn/character/broken', '{ not json')
    storage.setItem('denborn/character/future', JSON.stringify({ ...newcomer({ id: 'future' }), schemaVersion: 9 }))
    const entries = Object.fromEntries(library.characters().map((entry) => [entry.id, entry]))
    expect(entries['character-0001']?.read.ok).toBe(true)
    expect(entries.broken).toEqual({ id: 'broken', read: { ok: false, reason: 'not-this-kind' }, raw: '{ not json' })
    expect(entries.future?.read).toEqual({ ok: false, reason: 'newer-version', found: 9 })
  })

  it('says so when there is no room left, and loses nothing already kept', () => {
    // Room for two characters and a half.
    const storage = memory({ room: JSON.stringify(newcomer()).length * 2.5 })
    const library = openLibrary(storage)
    expect(library.saveCharacter(newcomer())).toEqual({ ok: true })
    expect(library.saveCharacter(newcomer({ id: 'character-0002' }))).toEqual({ ok: true })
    expect(library.saveCharacter(newcomer({ id: 'character-0003' }))).toEqual({ ok: false, reason: 'full' })
    expect(library.characters().map((entry) => entry.id)).toEqual(['character-0001', 'character-0002'])
  })

  it('says so when the browser refuses access to its storage', () => {
    expect(openLibrary(memory({ refuses: true })).saveCharacter(newcomer())).toEqual({ ok: false, reason: 'blocked' })
  })
})

describe('the invitations opened on a device', () => {
  it('give back the rules of a campaign, version by version', () => {
    const library = openLibrary(memory())
    library.saveInvitation(invite(1), testPack.species)
    library.saveInvitation(invite(2), testPack.species)
    expect(library.rulesOf('campaign-0001', 2, testPack.species)).toEqual(testRules({ version: 2 }))
    expect(library.rulesOf('campaign-0001', 1, testPack.species)?.version).toBe(1)
    expect(library.invitations(testPack.species).map((entry) => entry.ok && entry.value.rules.version)).toEqual([1, 2])
  })

  it('come from the campaign itself on the device that keeps it, any version of its history', () => {
    const library = openLibrary(memory())
    library.saveCampaign({ kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 1, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [testRules(), testRules({ version: 2, startingLevel: 30 })], characters: [] })
    expect(library.rulesOf('campaign-0001', 1, testPack.species)?.startingLevel).toBe(5)
    expect(library.rulesOf('campaign-0001', 2, testPack.species)?.startingLevel).toBe(30)
    expect(library.rulesOf('campaign-0001', 3, testPack.species)).toBeUndefined()
  })

  it('give nothing for a campaign or a version never opened here', () => {
    const library = openLibrary(memory())
    library.saveInvitation(invite(1), testPack.species)
    expect(library.rulesOf('campaign-0001', 3, testPack.species)).toBeUndefined()
    expect(library.rulesOf('campaign-9999', 1, testPack.species)).toBeUndefined()
  })
})

describe('new ids', () => {
  it('are 16 characters safe in a link, and never the same twice', () => {
    const ids = Array.from({ length: 500 }, newId)
    expect(ids.every((id) => /^[A-Za-z0-9_-]{16}$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(500)
  })
})
