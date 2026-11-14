import { describe, expect, it } from 'vitest'
import { checkRules, isRulesHistoryInOrder } from './rules-check'
import { testPack, testRules } from './test-pack'

describe('campaign rules against the game data', () => {
  it('accepts rules that only name what exists', () => {
    expect(checkRules(testRules(), testPack)).toEqual([])
  })

  it('refuses a species the data does not have, or one listed twice', () => {
    expect(checkRules(testRules({ species: ['sparkmouse', 'nosuchmon', 'sparkmouse'] }), testPack)).toEqual([
      { kind: 'unknown-species', species: 'nosuchmon' },
      { kind: 'repeated-species', species: 'sparkmouse' },
    ])
  })

  it('refuses a common move that does not exist, or that a GM may not offer', () => {
    expect(checkRules(testRules({ commonMoves: ['shared', 'nosuchmove', 'kept'] }), testPack)).toEqual([
      { kind: 'unknown-move', move: 'nosuchmove' },
      { kind: 'move-not-offered', move: 'kept' },
    ])
  })

  it('refuses packs that share a name, whatever the capitals, and a blank name', () => {
    const packs = [
      { name: 'Explorer', items: [] },
      { name: ' explorer ', items: [] },
      { name: '   ', items: [] },
    ]
    expect(checkRules(testRules({ itemPacks: packs }), testPack)).toEqual([
      { kind: 'repeated-pack-name', pack: 1 },
      { kind: 'blank-pack-name', pack: 2 },
    ])
  })

  it('refuses an item the data does not have, or one listed twice in a pack', () => {
    const packs = [
      {
        name: 'Odd',
        items: [
          { item: 'potion', quantity: 1 },
          { item: 'nosuchitem', quantity: 1 },
          { item: 'potion', quantity: 2 },
        ],
      },
    ]
    expect(checkRules(testRules({ itemPacks: packs }), testPack)).toEqual([
      { kind: 'unknown-item', pack: 0, item: 'nosuchitem' },
      { kind: 'repeated-item', pack: 0, item: 'potion' },
    ])
  })
})

describe('a rules history', () => {
  it('runs 1, 2, 3 with nothing missing', () => {
    expect(isRulesHistoryInOrder([testRules({ version: 1 }), testRules({ version: 2 })])).toBe(true)
    expect(isRulesHistoryInOrder([testRules({ version: 1 }), testRules({ version: 3 })])).toBe(false)
    expect(isRulesHistoryInOrder([testRules({ version: 2 })])).toBe(false)
  })
})
