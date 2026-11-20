import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import { maxHpOf } from './character-check'
import { sheetNumbers } from './sheet'
import { newcomer, testPack } from './test-pack'

describe('the numbers of a character sheet', () => {
  it('shows the stats the checks and the battle use', () => {
    const veteran = { level: 50, exp: expForLevel(50) }
    const bold = newcomer({ ...veteran, nature: 'bold' })
    const numbers = sheetNumbers(bold, testPack)
    const plain = sheetNumbers(newcomer({ ...veteran, nature: 'plain' }), testPack)
    expect(numbers?.stats.hp).toBe(maxHpOf(bold, testPack))
    // The made-up Bold nature raises Defense and lowers Attack; the plain one changes nothing.
    expect(numbers && plain && numbers.stats.def > plain.stats.def && numbers.stats.atk < plain.stats.atk).toBe(true)
    expect(numbers?.stats.spe).toBe(plain?.stats.spe)
  })

  it('counts the points still to place', () => {
    // Level 5: 4 attribute points and 15 TV.
    const fresh = sheetNumbers(newcomer(), testPack)
    expect(fresh?.unplaced).toEqual({ attributes: 4, tv: 15 })
    const spent = sheetNumbers(newcomer({ ivs: { hp: 9, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, evs: { hp: 0, atk: 10, def: 0, spa: 0, spd: 0, spe: 5 } }), testPack)
    // 9 IVs, and EVs worth 2 and 1: 12 TV, shown stat by stat.
    expect(spent?.unplaced).toEqual({ attributes: 4, tv: 3 })
    expect(spent?.tv).toEqual({ hp: 9, atk: 2, def: 0, spa: 0, spd: 0, spe: 1 })
  })

  it('says how far into its level the character is', () => {
    const start = expForLevel(5)
    const next = expForLevel(6)
    expect(sheetNumbers(newcomer(), testPack)?.exp).toEqual({ next, progress: 0 })
    expect(sheetNumbers(newcomer({ exp: start + (next - start) / 2 }), testPack)?.exp.progress).toBeCloseTo(0.5)
  })

  it('has no next level at 100', () => {
    expect(sheetNumbers(newcomer({ level: 100, exp: expForLevel(100) }), testPack)?.exp).toEqual({ next: undefined, progress: 1 })
  })

  it('gives each move its maximum PP, PP Ups included', () => {
    const numbers = sheetNumbers(newcomer({ moves: [{ id: 'tackle', ppUps: 2, pp: 10 }, { id: 'onechance', ppUps: 0, pp: 1 }] }), testPack)
    expect(numbers?.maxPp).toEqual({ tackle: 49, onechance: 1 })
  })

  it('gives nothing for a species or a nature the data does not have', () => {
    expect(sheetNumbers(newcomer({ species: 'nosuchmon' }), testPack)).toBeUndefined()
    expect(sheetNumbers(newcomer({ nature: 'nosuchnature' }), testPack)).toBeUndefined()
  })
})
