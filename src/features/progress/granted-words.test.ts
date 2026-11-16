import { describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { grantedSentences } from './granted-words'

const said = (granted: Parameters<typeof grantedSentences>[0]): string[] => grantedSentences(granted, 'Volt', (id) => id.toUpperCase(), en)

describe('what the game master gave or took, in words', () => {
  it('says what was given and what was taken apart, each amount as a count', () => {
    expect(said({ exp: 200, money: -150, items: [{ item: 'tonic', quantity: 2 }, { item: 'phoenix', quantity: -1 }] })).toEqual([
      en.progress.granted.gave('Volt', '200 EXP, TONIC ×2'),
      en.progress.granted.took('Volt', '150 Pokédollars, PHOENIX ×1'),
    ])
  })

  it('says only what happened, and the level the EXP reached', () => {
    expect(said({ exp: 0, money: 500, items: [] })).toEqual([en.progress.granted.gave('Volt', '500 Pokédollars')])
    expect(said({ exp: 900, money: 0, items: [], level: { from: 11, to: 13 } })).toEqual([en.progress.granted.gave('Volt', '900 EXP'), en.session.join.levelUp('Volt', 13)])
  })
})
