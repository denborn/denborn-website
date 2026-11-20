import { describe, expect, it } from 'vitest'
import type { DataPack, MoveData } from '../../data/types'
import { move, testPack } from '../../domain/test-pack'
import { NO_MOVE_FILTER, movesListed, typesOffered } from './move-list'

const made = (id: string, fr: string, part: Partial<MoveData>): MoveData => ({ ...move(id, 10), name: { en: id, fr }, ...part })

const pack: DataPack = {
  ...testPack,
  moves: {
    ember: made('ember', 'Flammèche', { type: 'Fire', category: 'Special', power: 40 }),
    growl: made('growl', 'Rugissement', { type: 'Normal', category: 'Status', power: 0 }),
    eruption: made('eruption', 'Éruption', { type: 'Fire', category: 'Special', power: 150 }),
    tackle: made('tackle', 'Charge', { type: 'Normal', category: 'Physical', power: 40 }),
  },
}
const offered = ['tackle', 'ember', 'growl', 'eruption', 'not-in-the-data']
const ids = (moves: MoveData[]): string[] => moves.map((one) => one.id)

describe('the list a move is chosen from', () => {
  it('is in the alphabet’s order in the language shown, accents set aside, without what the game data lacks', () => {
    expect(ids(movesListed(offered, pack, NO_MOVE_FILTER, 'en'))).toEqual(['ember', 'eruption', 'growl', 'tackle'])
    // Charge, Éruption, Flammèche, Rugissement.
    expect(ids(movesListed(offered, pack, NO_MOVE_FILTER, 'fr'))).toEqual(['tackle', 'eruption', 'ember', 'growl'])
  })

  it('is narrowed by a part of a name, or by a type', () => {
    expect(ids(movesListed(offered, pack, { ...NO_MOVE_FILTER, search: 'ERUP' }, 'fr'))).toEqual(['eruption'])
    expect(ids(movesListed(offered, pack, { ...NO_MOVE_FILTER, type: 'Fire' }, 'en'))).toEqual(['ember', 'eruption'])
    expect(ids(movesListed(offered, pack, { search: 'e', type: 'Normal' }, 'en'))).toEqual(['tackle'])
  })

  it('says which types it has to offer, each once', () => {
    expect(typesOffered(offered, pack)).toEqual(['Fire', 'Normal'])
  })
})
