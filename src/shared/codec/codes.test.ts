import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import type { CharacterDocument } from '../schema/character'
import { type Invitation, decodeCharacterCode, decodeCreationCode, encodeCharacterCode, encodeCreationCode, qrForm } from './codes'
import { pack } from './packing'

const invite: Invitation = { campaign: { id: 'campaign-0001', name: 'Les Égarés' }, dataPackVersion: 'test-pack', rules: testRules() }
const species = testPack.species

describe('a creation code', () => {
  it('carries a campaign and its rules to another device', () => {
    expect(decodeCreationCode(encodeCreationCode(invite, species), species)).toEqual({ ok: true, value: invite })
  })

  it('carries every rule, whatever was chosen', () => {
    const other: Invitation = {
      ...invite,
      rules: testRules({ version: 7, species: ['stonegolem'], startingLevel: 100, startingMoney: 9_999_999, natures: 'neutral', moveAccess: 'level-up-tm-tutor-egg', commonMoves: [], itemPacks: [{ name: 'Rien', items: [] }] }),
    }
    expect(decodeCreationCode(encodeCreationCode(other, species), species)).toEqual({ ok: true, value: other })
  })

  it('is read from a whole link or with spaces around it, as a paste or a scan gives it', () => {
    const code = encodeCreationCode(invite, species)
    expect(decodeCreationCode(`https://denborn.example/#${code}`, species).ok).toBe(true)
    expect(decodeCreationCode(`  ${code}\n`, species).ok).toBe(true)
  })

  it('is not mistaken for a character code, nor the other way round', () => {
    expect(decodeCreationCode(encodeCharacterCode(newcomer()), species)).toEqual({ ok: false, reason: 'not-this-kind' })
    expect(decodeCharacterCode(encodeCreationCode(invite, species))).toEqual({ ok: false, reason: 'not-this-kind' })
    expect(decodeCreationCode('hello', species)).toEqual({ ok: false, reason: 'not-this-kind' })
  })

  it('made by a newer app is refused as such', () => {
    const newer = encodeCreationCode(invite, species).replace(/^dnr1\./, 'dnr2.')
    expect(decodeCreationCode(newer, species)).toEqual({ ok: false, reason: 'newer-version' })
  })

  it('cut short or altered is refused as damaged', () => {
    const code = encodeCreationCode(invite, species)
    expect(decodeCreationCode(code.slice(0, -6), species)).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeCreationCode(`dnr1.${pack(['test-pack', 'campaign-0001', 'X', 'not rules'])}`, species)).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeCreationCode(`dnr1.${pack({ not: 'a list' })}`, species)).toEqual({ ok: false, reason: 'damaged' })
  })

  it('whose rules break the format is refused, even well packed', () => {
    const fields = ['test-pack', 'campaign-0001', 'X', [1, 'BA', 101, 0, 0, 0, [], [['Pack', []]]]]
    // Starting level 101.
    expect(decodeCreationCode(`dnr1.${pack(fields)}`, species)).toEqual({ ok: false, reason: 'damaged' })
  })

  it('naming a species this app does not have says which number', () => {
    const wider = { ...species, newmon: { id: 'newmon', num: 40 } }
    const code = encodeCreationCode({ ...invite, rules: testRules({ species: ['sparkmouse', 'newmon'] }) }, wider)
    expect(decodeCreationCode(code, species)).toEqual({ ok: false, reason: 'unknown-species', number: 40 })
  })
})

describe('a character code', () => {
  const there = (character: CharacterDocument) => decodeCharacterCode(encodeCharacterCode(character))

  it('carries a whole character to another device', () => {
    expect(there(newcomer())).toEqual({ ok: true, value: newcomer() })
  })

  it.each([
    ['no nature and no held item', { nature: undefined, heldItem: undefined }],
    ['a status condition', { status: 'par' as const }],
    ['a downed Pokémon and its stacks', { hp: 0, condition: { state: 'downed' as const, stacks: 2 } }],
    ['a dead Pokémon', { hp: 0, condition: { state: 'dead' as const } }],
    ['six moves, PP Ups and spent PP', { moves: ['tackle', 'spark', 'megabolt', 'tmwave', 'eggkick', 'shared'].map((id, index) => ({ id, ppUps: index % 4, pp: index })) }],
    ['a full bag and money', { bag: [{ item: 'potion', quantity: 999 }, { item: 'rope', quantity: 1 }], money: 123_456 }],
    ['a name with accents and punctuation', { nickname: "Éclair-2 d'Été." }],
  ])('carries %s', (_, changes) => {
    const character = newcomer(changes)
    // Absent fields stay absent rather than become "undefined".
    expect(there(character)).toEqual({ ok: true, value: JSON.parse(JSON.stringify(character)) as CharacterDocument })
  })

  it('names its rules without carrying them, unlike a file', () => {
    const decoded = there({ ...newcomer(), rules: testRules() })
    expect(decoded.ok && decoded.value.rules).toBeUndefined()
    expect(decoded.ok && decoded.value.campaign).toEqual({ id: 'campaign-0001', name: 'Test', rulesVersion: 1 })
  })

  it('altered so that it breaks the format is refused', () => {
    const fields = JSON.parse(JSON.stringify([...Array<number>(24).fill(0)])) as unknown[]
    expect(decodeCharacterCode(`dnc1.${pack(fields)}`)).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeCharacterCode(encodeCharacterCode(newcomer()).slice(0, -8))).toEqual({ ok: false, reason: 'damaged' })
  })
})

describe('a code in its QR form', () => {
  it('is in capitals and digits, and reads as the same code', () => {
    const code = encodeCharacterCode(newcomer())
    const forQr = qrForm(code)
    expect(forQr).toMatch(/^DNC1\.[A-Z2-7]+$/)
    expect(decodeCharacterCode(forQr)).toEqual(decodeCharacterCode(code))
    expect(decodeCreationCode(qrForm(encodeCreationCode(invite, species)), species)).toEqual({ ok: true, value: invite })
  })

  it('can be a link to the app, which any camera can open, and still reads', () => {
    const link = qrForm(encodeCharacterCode(newcomer()), 'https://denborn.example')
    expect(link.startsWith('https://denborn.example/#DNC1.')).toBe(true)
    expect(decodeCharacterCode(link).ok).toBe(true)
  })

  it('damaged, is refused like any other', () => {
    expect(decodeCharacterCode(qrForm(encodeCharacterCode(newcomer())).slice(0, -8))).toEqual({ ok: false, reason: 'damaged' })
    expect(decodeCharacterCode('DNC1.not-base-32')).toEqual({ ok: false, reason: 'damaged' })
  })
})
