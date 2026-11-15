import { describe, expect, it } from 'vitest'
import { newcomer, testRules } from '../../domain/test-pack'
import { readCampaign } from './campaign'
import { readCharacter } from './character'

const campaign = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [testRules()], characters: [newcomer()], encounters: [] }

describe('reading a saved document', () => {
  it('gives the document back when it is well formed', () => {
    expect(readCharacter(newcomer())).toEqual({ ok: true, value: newcomer() })
    expect(readCampaign(campaign)).toEqual({ ok: true, value: campaign })
  })

  it('reads a campaign saved before sessions and encounters existed as one nobody joined and nothing was prepared for', () => {
    const older: Partial<typeof campaign> = { ...campaign }
    delete older.characters
    delete older.encounters
    expect(readCampaign(older)).toEqual({ ok: true, value: { ...campaign, characters: [], encounters: [] } })
  })

  it('survives the trip through a JSON file', () => {
    const file: unknown = JSON.parse(JSON.stringify({ ...newcomer(), rules: testRules() }))
    expect(readCharacter(file)).toMatchObject({ ok: true, value: { nickname: 'Volt', rules: { version: 1 } } })
  })

  it.each([null, 'a string', 42, [], {}, { kind: 'denborn.campaign', schemaVersion: 1 }])('says %j is not a character at all', (input) => {
    expect(readCharacter(input)).toEqual({ ok: false, reason: 'not-this-kind' })
  })

  it('refuses a document written by a newer version of the app, rather than half-read it', () => {
    expect(readCharacter({ ...newcomer(), schemaVersion: 2 })).toEqual({ ok: false, reason: 'newer-version', found: 2 })
  })

  it('says where a malformed document is wrong', () => {
    const result = readCharacter({ ...newcomer(), level: 101, moves: [] })
    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== 'malformed') throw new Error('expected a malformed document')
    expect(result.issues.map((issue) => issue.split(':')[0])).toEqual(['level', 'moves'])
  })

  it('drops what it does not know instead of keeping it', () => {
    const result = readCharacter({ ...newcomer(), extra: 'unexpected' })
    expect(result.ok && 'extra' in result.value).toBe(false)
  })

  it('refuses a list longer than a document may hold', () => {
    const tooMany = Array.from({ length: 7 }, (_, index) => ({ id: `move${index}`, ppUps: 0, pp: 1 }))
    expect(readCharacter({ ...newcomer(), moves: tooMany })).toMatchObject({ ok: false, reason: 'malformed' })
  })
})
