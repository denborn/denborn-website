import { describe, expect, it } from 'vitest'
import { openCharacter } from './open-character'
import { newcomer, testPack, testRules } from './test-pack'

describe('taking in a character from outside', () => {
  it('accepts a file that follows the rules it carries', () => {
    const opened = openCharacter({ ...newcomer(), rules: testRules() }, undefined, testPack)
    expect(opened).toMatchObject({ ok: true, otherGameData: false, rules: { version: 1 } })
  })

  it('accepts a code, which carries no rules, when this device knows them', () => {
    expect(openCharacter(newcomer(), testRules(), testPack).ok).toBe(true)
  })

  it('refuses a code whose rules this device does not know, and says which campaign', () => {
    expect(openCharacter(newcomer(), undefined, testPack)).toEqual({
      ok: false,
      reason: 'rules-unknown',
      campaign: { id: 'campaign-0001', name: 'Test', rulesVersion: 1 },
    })
  })

  it('flags a character saved with other game data', () => {
    const opened = openCharacter(newcomer({ dataPackVersion: 'older-pack' }), testRules(), testPack)
    expect(opened).toMatchObject({ ok: true, otherGameData: true })
  })

  it('refuses a character that breaks its rules, and says how', () => {
    const opened = openCharacter(newcomer({ ability: 'sturdy' }), testRules(), testPack)
    expect(opened).toEqual({ ok: false, reason: 'character-invalid', problems: [{ kind: 'ability' }] })
  })

  it('refuses rules that name what this app’s data does not have', () => {
    const opened = openCharacter({ ...newcomer(), rules: testRules({ commonMoves: ['nosuchmove'] }) }, undefined, testPack)
    expect(opened).toEqual({ ok: false, reason: 'rules-invalid', problems: [{ kind: 'unknown-move', move: 'nosuchmove' }] })
  })

  it('holds a file to the rules the device already has, not to the copy the file brings', () => {
    // The file's own rules were rewritten to allow TM moves; the campaign's real rules do not.
    const forged = { ...newcomer({ moves: [{ id: 'tmwave', ppUps: 0, pp: 20 }] }), rules: testRules({ moveAccess: 'level-up-tm-tutor-egg' }) }
    expect(openCharacter(forged, undefined, testPack).ok).toBe(true)
    expect(openCharacter(forged, testRules(), testPack)).toEqual({
      ok: false,
      reason: 'character-invalid',
      problems: [{ kind: 'move-not-eligible', move: 'tmwave' }],
    })
  })
})
