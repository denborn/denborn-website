import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Stored } from '../../storage/library'
import { sheetToShow } from './open-sheet'

const kept = (character: CharacterDocument): Stored<CharacterDocument> => ({ id: character.id, read: { ok: true, value: character }, raw: JSON.stringify(character) })
const noRulesHere = (): undefined => undefined

describe('what the sheet page shows for a kept character', () => {
  it('shows the sheet of a character that follows the rules kept with it', () => {
    const shown = sheetToShow(kept({ ...newcomer(), rules: testRules() }), noRulesHere, testPack)
    expect(shown).toMatchObject({ show: 'sheet', otherGameData: false, rules: { version: 1 }, character: { id: 'character-0001' } })
  })

  it('says so when the character was saved with other game data', () => {
    const shown = sheetToShow(kept({ ...newcomer({ dataPackVersion: 'older-pack' }), rules: testRules() }), noRulesHere, testPack)
    expect(shown).toMatchObject({ show: 'sheet', otherGameData: true })
  })

  it('has no sheet for an id this device does not keep', () => {
    expect(sheetToShow(undefined, noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'missing' })
  })

  it('tells an entry from a newer app apart from one it cannot read at all', () => {
    const entry = (read: Stored<CharacterDocument>['read']): Stored<CharacterDocument> => ({ id: 'x', read, raw: '{}' })
    expect(sheetToShow(entry({ ok: false, reason: 'newer-version', found: 9 }), noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'newer' })
    expect(sheetToShow(entry({ ok: false, reason: 'malformed', issues: [] }), noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'unreadable' })
    expect(sheetToShow(entry({ ok: false, reason: 'not-this-kind' }), noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'unreadable' })
  })

  it('asks this device for the rules of the character’s campaign and version when it carries none', () => {
    const asked: CharacterDocument['campaign'][] = []
    const rulesOf = (campaign: CharacterDocument['campaign']) => {
      asked.push(campaign)
      return campaign.id === 'campaign-0001' && campaign.rulesVersion === 1 ? testRules() : undefined
    }
    expect(sheetToShow(kept(newcomer()), rulesOf, testPack).show).toBe('sheet')
    expect(asked).toEqual([{ id: 'campaign-0001', name: 'Test', rulesVersion: 1 }])
    expect(sheetToShow(kept(newcomer()), noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'rulesUnknown' })
  })

  it('shows no sheet for a character that breaks its rules', () => {
    expect(sheetToShow(kept({ ...newcomer({ ability: 'sturdy' }), rules: testRules() }), noRulesHere, testPack)).toEqual({ show: 'problem', problem: 'invalid' })
  })

  it('checks against this device’s own rules before the ones kept with the character', () => {
    // The copy kept with the character would let it pass; the device's own rules start characters higher.
    const character = { ...newcomer(), rules: testRules() }
    expect(sheetToShow(kept(character), () => testRules({ startingLevel: 50 }), testPack)).toEqual({ show: 'problem', problem: 'invalid' })
  })
})
