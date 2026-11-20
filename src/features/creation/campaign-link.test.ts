import { describe, expect, it } from 'vitest'
import { newcomer, testPack, testRules } from '../../domain/test-pack'
import { type Invitation, encodeCharacterCode, encodeCreationCode, qrForm } from '../../shared/codec/codes'
import { joinLink, makeRoomCode } from '../../shared/protocol/room-code'
import { campaignsOffered, readCampaignLink } from './campaign-link'

const species = testPack.species
const invitation: Invitation = { campaign: { id: 'campaign-0001', name: 'Night Shift' }, dataPackVersion: 'test-pack', rules: testRules() }
const code = encodeCreationCode(invitation, species)

describe('a campaign brought to this device', () => {
  it('is read from its code, alone, at the end of a link, or as its QR code holds it', () => {
    for (const text of [code, `https://denborn.example/#${code}`, qrForm(code, 'https://denborn.example')]) {
      expect(readCampaignLink(text, species)).toEqual({ ok: true, invitation })
    }
  })

  it('says what is wrong with a creation link that cannot be read', () => {
    expect(readCampaignLink(code.slice(0, -6), species)).toEqual({ ok: false, problem: 'damaged' })
    expect(readCampaignLink(code.replace(/^dnr1\./, 'dnr2.'), species)).toEqual({ ok: false, problem: 'newer-version' })
  })

  it('says so when the text is another of the app’s codes: a character’s, or a session’s', () => {
    expect(readCampaignLink(encodeCharacterCode(newcomer()), species)).toEqual({ ok: false, problem: 'character' })
    const room = makeRoomCode(new Uint8Array([3, 14, 15, 9, 26]))
    expect(readCampaignLink(joinLink(room, 'https://denborn.example'), species)).toEqual({ ok: false, problem: 'join' })
    expect(readCampaignLink(room, species)).toEqual({ ok: false, problem: 'join' })
  })

  it('says it is not a creation link for anything else', () => {
    expect(readCampaignLink('hello there', species)).toEqual({ ok: false, problem: 'not-this-kind' })
    expect(readCampaignLink('', species)).toEqual({ ok: false, problem: 'not-this-kind' })
  })
})

describe('the campaigns to choose from', () => {
  const named = (id: string, name: string): Invitation => ({ ...invitation, campaign: { id, name } })

  it('are by name, accents and capitals set aside', () => {
    const offered = campaignsOffered([named('c', 'zenith'), named('a', 'Éclipse'), named('b', 'dawn patrol')])
    expect(offered.map((one) => one.campaign.name)).toEqual(['dawn patrol', 'Éclipse', 'zenith'])
  })

  it('keep one order for two of the same name', () => {
    const both = [named('b', 'Night Shift'), named('a', 'Night Shift')]
    expect(campaignsOffered(both).map((one) => one.campaign.id)).toEqual(['a', 'b'])
    expect(campaignsOffered([...both].reverse()).map((one) => one.campaign.id)).toEqual(['a', 'b'])
  })
})
