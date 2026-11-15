import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import { encodeCharacterCode, encodeCreationCode, qrForm } from '../../shared/codec/codes'
import type { CharacterDocument } from '../../shared/schema/character'
import { campaignFile, characterFile } from '../../storage/files'
import type { Stored } from '../../storage/library'
import { type Device, readIncomingCode, readIncomingFile } from './incoming'

const kept = (character: CharacterDocument): Stored<CharacterDocument> => ({ id: character.id, read: { ok: true, value: character }, raw: JSON.stringify(character) })

/** A device that keeps the given characters and, when asked to, knows the rules of the test campaign. */
function device(characters: Stored<CharacterDocument>[] = [], knowsRules = true): Device {
  return { pack: testPack, kept: characters, rulesOf: () => (knowsRules ? testRules() : undefined) }
}

const fileOf = (character: CharacterDocument): string => characterFile(character, testRules()).text

describe('a character coming in from its file', () => {
  it('is read with the rules the file carries, on a device that knows nothing of its campaign', () => {
    expect(readIncomingFile(fileOf(newcomer()), device([], false))).toMatchObject({ ok: true, standing: 'new', otherGameData: false, character: { id: 'character-0001' } })
  })

  it('is refused when it breaks its rules', () => {
    expect(readIncomingFile(fileOf(newcomer({ ability: 'sturdy' })), device())).toEqual({ ok: false, problem: 'invalid' })
  })

  it('says what the file is when it is not a character', () => {
    const campaign = campaignFile({ kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 0, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [testRules()], characters: [] })
    expect(readIncomingFile(campaign.text, device())).toEqual({ ok: false, problem: 'campaignFile' })
    expect(readIncomingFile('a holiday picture', device())).toEqual({ ok: false, problem: 'notACharacter' })
    expect(readIncomingFile('{"kind":"something else"}', device())).toEqual({ ok: false, problem: 'notACharacter' })
  })

  it('tells a file from a newer app apart from a damaged one', () => {
    expect(readIncomingFile(JSON.stringify({ ...newcomer(), schemaVersion: 99 }), device())).toEqual({ ok: false, problem: 'newer' })
    expect(readIncomingFile(JSON.stringify({ ...newcomer(), level: 'high' }), device())).toEqual({ ok: false, problem: 'damaged' })
  })
})

describe('a character coming in from its code', () => {
  const code = encodeCharacterCode(newcomer())

  it('is read from the code alone, from a link and from the form a QR code holds', () => {
    for (const text of [code, `https://denborn.example/#${code}`, qrForm(code, 'https://denborn.example')]) {
      expect(readIncomingCode(text, device())).toMatchObject({ ok: true, standing: 'new', rules: { version: 1 } })
    }
  })

  it('needs the rules of its campaign on this device, since a code carries none', () => {
    expect(readIncomingCode(code, device([], false))).toEqual({ ok: false, problem: 'rulesUnknown' })
  })

  it('says so when the text is a creation link, or no code at all', () => {
    const creation = encodeCreationCode({ campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules() }, testPack.species)
    expect(readIncomingCode(creation, device())).toEqual({ ok: false, problem: 'creationLink' })
    expect(readIncomingCode('hello', device())).toEqual({ ok: false, problem: 'notACharacter' })
  })

  it('is refused when the code was cut short', () => {
    expect(readIncomingCode(code.slice(0, -8), device())).toEqual({ ok: false, problem: 'damaged' })
  })
})

describe('a character already kept on this device', () => {
  const here = { ...newcomer({ revision: 4 }), rules: testRules() }
  const incoming = (changes: Partial<CharacterDocument>) => readIncomingCode(encodeCharacterCode(newcomer({ revision: 4, ...changes })), device([kept(here)]))

  it('is the same when nothing differs but the rules a file carries', () => {
    expect(incoming({})).toMatchObject({ ok: true, standing: 'same', kept: { revision: 4 } })
  })

  it('is newer or older by how many times each copy was saved', () => {
    expect(incoming({ revision: 5, money: 900 })).toMatchObject({ standing: 'newer' })
    expect(incoming({ revision: 3, money: 100 })).toMatchObject({ standing: 'older' })
  })

  it('differs when both copies were saved as many times and are not alike', () => {
    expect(incoming({ money: 501 })).toMatchObject({ standing: 'differs', kept: { money: 500 } })
  })

  it('says so when the copy kept here cannot be read, instead of taking its place unasked', () => {
    const unreadable: Stored<CharacterDocument> = { id: 'character-0001', read: { ok: false, reason: 'malformed', issues: [] }, raw: '{}' }
    const read = readIncomingCode(encodeCharacterCode(newcomer()), device([unreadable]))
    expect(read).toMatchObject({ ok: true, standing: 'unreadable' })
    expect(read.ok && read.kept).toBeUndefined()
  })
})
