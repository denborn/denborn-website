import { describe, expect, it } from 'vitest'
import { testPack, testRules } from '../../domain/test-pack'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { type RulesDraft, STARTING_LEVEL_SHOWN, STARTING_MONEY_SHOWN, campaignFrom, draftOf, hasChanges, newDraft, only, stateOf, ticked, unticked } from './rules-draft'

const id = (): string => 'campaign-0001'

/** A draft with everything a save needs. */
function ready(changes: Partial<RulesDraft> = {}): RulesDraft {
  return { ...newDraft(testPack), name: 'Night Shift', natures: 'chosen', moveAccess: 'level-up', itemPacks: [{ name: 'Starter', items: [{ item: 'potion', quantity: 2 }] }], ...changes }
}

const firstSave = (): CampaignDocument => {
  const campaign = campaignFrom(ready(), undefined, testPack, id)
  if (!campaign) throw new Error('The ready draft should save')
  return campaign
}

describe('rules being set', () => {
  it('start with every species, and say what the game master must still choose', () => {
    const draft = newDraft(testPack)
    expect(draft.species).toEqual(['sparkmouse', 'stonegolem'])
    expect(stateOf(draft, testPack).gaps).toEqual(['name', 'natures', 'moveAccess', 'itemPacks'])
    expect(stateOf(ready(), testPack)).toEqual({ gaps: [], problems: [] })
  })

  it('cannot go without a single species, nor with a name made of spaces', () => {
    expect(stateOf(ready({ species: [], name: '   ' }), testPack).gaps).toEqual(['name', 'species'])
  })

  it('name what is wrong with the item packs', () => {
    const packs = [{ name: 'Starter', items: [] }, { name: ' starter ', items: [] }, { name: '', items: [] }]
    expect(stateOf(ready({ itemPacks: packs }), testPack).problems).toEqual([
      { kind: 'repeated-pack-name', pack: 1 },
      { kind: 'blank-pack-name', pack: 2 },
    ])
  })
})

describe('saving a campaign', () => {
  it('makes a campaign with its first rules, species in Pokédex order whatever the order they were ticked in', () => {
    const campaign = campaignFrom(ready({ name: '  Night Shift ', species: ['stonegolem', 'sparkmouse'] }), undefined, testPack, id)
    expect(campaign).toMatchObject({ id: 'campaign-0001', revision: 0, name: 'Night Shift', dataPackVersion: 'test-pack' })
    expect(campaign?.rulesHistory).toEqual([{ ...testRules(), version: 1, species: ['sparkmouse', 'stonegolem'], startingLevel: STARTING_LEVEL_SHOWN, startingMoney: STARTING_MONEY_SHOWN, commonMoves: [], itemPacks: [{ name: 'Starter', items: [{ item: 'potion', quantity: 2 }] }] }])
  })

  it('does not save while something is still to choose or wrong', () => {
    expect(campaignFrom(ready({ natures: undefined }), undefined, testPack, id)).toBeUndefined()
    expect(campaignFrom(ready({ itemPacks: [{ name: '', items: [] }] }), undefined, testPack, id)).toBeUndefined()
  })

  it('adds a version when a rule changes, and keeps the history', () => {
    const before = firstSave()
    const after = campaignFrom({ ...draftOf(before, testPack), startingLevel: 20 }, before, testPack, id)
    expect(after?.rulesHistory.map((rules) => [rules.version, rules.startingLevel])).toEqual([
      [1, STARTING_LEVEL_SHOWN],
      [2, 20],
    ])
    expect(after).toMatchObject({ id: before.id, revision: 1 })
  })

  it('adds no version when only the name changes: the name is not a rule', () => {
    const before = firstSave()
    const after = campaignFrom({ ...draftOf(before, testPack), name: 'Day Shift' }, before, testPack, id)
    expect(after).toMatchObject({ name: 'Day Shift', revision: 1 })
    expect(after?.rulesHistory).toEqual(before.rulesHistory)
  })

  it('gives back the very campaign when nothing changed', () => {
    const before = firstSave()
    expect(campaignFrom(draftOf(before, testPack), before, testPack, id)).toBe(before)
  })
})

describe('changes not saved yet', () => {
  it('are seen against a campaign not yet set, and against the campaign as kept', () => {
    expect(hasChanges(newDraft(testPack), undefined, testPack)).toBe(false)
    expect(hasChanges({ ...newDraft(testPack), natures: 'neutral' }, undefined, testPack)).toBe(true)
    const kept = firstSave()
    expect(hasChanges(draftOf(kept, testPack), kept, testPack)).toBe(false)
    expect(hasChanges({ ...draftOf(kept, testPack), commonMoves: ['shared'] }, kept, testPack)).toBe(true)
  })
})

describe('ticking the species shown', () => {
  it('keeps only the species shown, whatever was ticked before, in Pokédex order (decision 129)', () => {
    expect(only(['stonegolem', 'sparkmouse'], testPack)).toEqual(['sparkmouse', 'stonegolem'])
  })

  it('adds to the chosen species without repeating any, in Pokédex order', () => {
    expect(ticked(['stonegolem'], ['sparkmouse', 'stonegolem'], testPack)).toEqual(['sparkmouse', 'stonegolem'])
  })

  it('takes the shown species out and leaves the others', () => {
    expect(unticked(['sparkmouse', 'stonegolem'], ['stonegolem', 'unknown'])).toEqual(['sparkmouse'])
  })
})
