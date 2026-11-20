import { describe, expect, it } from 'vitest'
import { testPack, testRules } from '../../domain/test-pack'
import { expForLevel } from '../../game-rules/exp'
import type { StatSpread } from '../../game-rules/stats'
import type { Invitation } from '../../shared/codec/codes'
import type { CreationDraft } from './draft'
import { type Flow, NEW_FLOW } from './flow'
import { recapOf, trainedProfile } from './recap'

const spread = (values: Partial<StatSpread> = {}): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...values })
const base = spread({ hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 })

describe('what training makes of base stats', () => {
  it('is the base stats themselves with no TV and no nature', () => {
    expect(trainedProfile(base, spread())).toEqual(base)
  })

  it('adds half a point for each TV', () => {
    expect(trainedProfile(base, spread({ spe: 94, hp: 31 }))).toMatchObject({ spe: 90 + 47, hp: 35 + 15.5, atk: 55 })
  })

  it('raises one stat by a tenth and lowers another, TV included', () => {
    const made = trainedProfile(base, spread({ spe: 20 }), { plus: 'spe', minus: 'spa' })
    expect(made.spe).toBeCloseTo(110)
    expect(made.spa).toBeCloseTo(45)
    expect(made.atk).toBe(55)
  })

  it('changes nothing for a nature that raises and lowers the same stat', () => {
    expect(trainedProfile(base, spread(), { plus: 'atk', minus: 'atk' })).toEqual(base)
  })

  it('stops at the top of the scale', () => {
    expect(trainedProfile(spread({ hp: 250 }), spread({ hp: 94 })).hp).toBe(255)
  })
})

describe('what the top screen shows', () => {
  const invitation: Invitation = { campaign: { id: 'campaign-0001', name: 'Night Shift' }, dataPackVersion: 'test-pack', rules: testRules() }
  const flowWith = (draft: Partial<CreationDraft>, reached: Flow['reached'] = 'species'): Flow => ({ ...NEW_FLOW, campaign: 'campaign-0001', draft: { ...NEW_FLOW.draft, ...draft }, reached })

  it('knows nothing before a campaign is chosen', () => {
    expect(recapOf(NEW_FLOW, undefined, testPack)).toEqual({
      campaign: undefined,
      level: undefined,
      exp: undefined,
      species: undefined,
      nickname: '',
      gender: undefined,
      ability: undefined,
      nature: undefined,
      neutral: false,
      held: undefined,
      attributes: undefined,
      profile: undefined,
    })
  })

  it('has the campaign, its level and the EXP that goes with it once one is chosen', () => {
    expect(recapOf(flowWith({}), invitation, testPack)).toMatchObject({ campaign: 'Night Shift', level: 5, exp: expForLevel(5), species: undefined, profile: undefined })
  })

  it('has the Pokémon and its three sets of stats once it is chosen', () => {
    const recap = recapOf(flowWith({ species: 'sparkmouse', gender: 'F', ability: 'zap', nature: 'bold', ivs: spread({ spe: 10 }) }), invitation, testPack)
    expect(recap).toMatchObject({ species: { id: 'sparkmouse' }, gender: 'F', ability: 'zap', nature: { id: 'bold' } })
    expect(recap.profile?.base).toEqual(base)
    // Ten TV in Speed is five points of a base stat; Bold raises Defense and lowers Attack.
    expect(recap.profile?.trained.spe).toBe(95)
    expect(recap.profile?.trained.def).toBeCloseTo(44)
    expect(recap.profile?.trained.atk).toBeCloseTo(49.5)
  })

  it('has its stats at the campaign’s level, with the TV placed', () => {
    const veteran: Invitation = { ...invitation, rules: testRules({ startingLevel: 50 }) }
    const plain = recapOf(flowWith({ species: 'sparkmouse' }), veteran, testPack).profile?.stats
    const trained = recapOf(flowWith({ species: 'sparkmouse', ivs: spread({ spe: 10 }) }), veteran, testPack).profile?.stats
    // Ten TV are five points of Speed at level 50.
    expect(trained && plain && trained.spe - plain.spe).toBe(5)
    expect(trained?.hp).toBe(plain?.hp)
  })

  it('shows no nature where the campaign makes every Pokémon neutral', () => {
    const neutral: Invitation = { ...invitation, rules: testRules({ natures: 'neutral' }) }
    expect(recapOf(flowWith({ species: 'sparkmouse', nature: 'bold' }), neutral, testPack)).toMatchObject({ nature: undefined, neutral: true })
  })

  it('shows the roleplay attributes only once the player has been to their step, the identity (decision 302)', () => {
    expect(recapOf(flowWith({}, 'species'), invitation, testPack).attributes).toBeUndefined()
    expect(recapOf(flowWith({}, 'identity'), invitation, testPack).attributes).toEqual(NEW_FLOW.draft.attributes)
    expect(recapOf(flowWith({}, 'review'), invitation, testPack).attributes).toEqual(NEW_FLOW.draft.attributes)
  })

  it('shows what is held, or that nothing is, only once a pack is chosen', () => {
    expect(recapOf(flowWith({ heldItem: 'berry' }), invitation, testPack).held).toBeUndefined()
    expect(recapOf(flowWith({ pack: 0 }), invitation, testPack).held).toEqual({ item: undefined })
    expect(recapOf(flowWith({ pack: 0, heldItem: 'berry' }), invitation, testPack).held).toEqual({ item: 'berry' })
  })
})
