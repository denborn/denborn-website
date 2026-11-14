import { describe, expect, it } from 'vitest'
import { changes } from './fingerprint.ts'

const pack = (moves: Record<string, string>, species: Record<string, string> = {}) => ({
  version: 'test',
  sections: { moves, species },
})

describe('comparing two data packs', () => {
  it('lists what was added, changed and removed, and nothing else', () => {
    const before = pack({ tackle: 'aaa', growl: 'bbb', cut: 'ccc' }, { rattata: 'r1' })
    const after = pack({ tackle: 'aaa', growl: 'BBB', surf: 'ddd' }, { rattata: 'r1' })
    expect(changes(before, after).sort()).toEqual(['+ moves/surf', '- moves/cut', '~ moves/growl'])
  })

  it('finds no change between identical packs, and copes with a section one side lacks', () => {
    expect(changes(pack({ tackle: 'aaa' }), pack({ tackle: 'aaa' }))).toEqual([])
    expect(changes({ version: 'old', sections: {} }, pack({ tackle: 'aaa' }))).toEqual(['+ moves/tackle'])
  })
})
