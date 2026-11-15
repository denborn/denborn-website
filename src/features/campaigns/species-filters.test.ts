import { describe, expect, it } from 'vitest'
import type { DataPack, SpeciesData } from '../../data/types'
import { testPack } from '../../domain/test-pack'
import { NO_FILTER, type SpeciesFilter, speciesShown, statTotalRange, ticked, unticked } from './species-filters'

const base = testPack.species.sparkmouse
if (!base) throw new Error('The test pack lost its first species')
const stats = (each: number) => ({ hp: each, atk: each, def: each, spa: each, spd: each, spe: each })
const made = (id: string, num: number, part: Partial<SpeciesData>): SpeciesData => ({ ...base, id, num, name: { en: id, fr: id }, ...part })

/** A line of three, a Pokémon whose only earlier stage is not in the data, and a legendary one. */
const pack: DataPack = {
  ...testPack,
  species: {
    pup: made('pup', 1, { types: ['Fire'], baseStats: stats(50), evolutions: [{ to: 'hound', method: 'level', level: 16 }] }),
    hound: made('hound', 2, { types: ['Fire'], baseStats: stats(70), earlierStages: ['pup'], evolutions: [{ to: 'cerbère', method: 'item', item: 'stone' }] }),
    cerbère: made('cerbère', 3, { types: ['Fire', 'Dark'], baseStats: stats(90), earlierStages: ['hound', 'pup'] }),
    mouse: made('mouse', 4, { types: ['Electric'], baseStats: stats(55), earlierStages: ['babymouse'] }),
    titan: made('titan', 5, { types: ['Dark'], baseStats: stats(110), tags: ['Restricted Legendary'] }),
  },
}

const shown = (filter: Partial<SpeciesFilter>): string[] => speciesShown(pack, { ...NO_FILTER, ...filter }, 'en').map((species) => species.id)

describe('the species picker’s filters', () => {
  it('show every species in Pokédex order when nothing is set', () => {
    expect(shown({})).toEqual(['pup', 'hound', 'cerbère', 'mouse', 'titan'])
  })

  it('keep the first stages, counting only earlier stages that can be played', () => {
    expect(shown({ stage: 'first' })).toEqual(['pup', 'mouse', 'titan'])
  })

  it('keep the final stages', () => {
    expect(shown({ stage: 'final' })).toEqual(['cerbère', 'mouse', 'titan'])
  })

  it('keep the legendary ones, or leave them out', () => {
    expect(shown({ legendary: 'only' })).toEqual(['titan'])
    expect(shown({ legendary: 'without' })).toEqual(['pup', 'hound', 'cerbère', 'mouse'])
  })

  it('keep one type, whichever of a Pokémon’s two it is', () => {
    expect(shown({ type: 'Dark' })).toEqual(['cerbère', 'titan'])
  })

  it('keep the stat totals on one side of a number, the number included', () => {
    expect(shown({ statTotal: { side: 'atMost', total: 330 } })).toEqual(['pup', 'mouse'])
    expect(shown({ statTotal: { side: 'atLeast', total: 540 } })).toEqual(['cerbère', 'titan'])
    expect(statTotalRange(pack)).toEqual({ min: 300, max: 660 })
  })

  it('find a name without its accents or capitals, and narrow with the other filters', () => {
    expect(shown({ search: 'CERBERE' })).toEqual(['cerbère'])
    expect(shown({ search: 'e', stage: 'final', type: 'Electric' })).toEqual(['mouse'])
  })
})

describe('ticking what is shown', () => {
  it('adds to the chosen species without repeating any, in Pokédex order', () => {
    expect(ticked(['titan', 'pup'], ['hound', 'pup'], pack)).toEqual(['pup', 'hound', 'titan'])
  })

  it('takes the shown species out and leaves the others', () => {
    expect(unticked(['pup', 'hound', 'titan'], ['hound', 'mouse'])).toEqual(['pup', 'titan'])
  })
})
