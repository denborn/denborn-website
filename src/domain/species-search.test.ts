import { describe, expect, it } from 'vitest'
import type { DataPack, SpeciesData } from '../data/types'
import { generationOf } from '../data/generations'
import { NO_FILTER, type SpeciesFilter, abilitiesOffered, canLearn, generationsOffered, movesLearnable, speciesOffered, speciesShown, statTotalRange } from './species-search'
import { testPack, testRules } from './test-pack'

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

describe('the filters on a list of species', () => {
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
    expect(shown({ type: 'dark' })).toEqual(['cerbère', 'titan'])
  })

  it('keep the stat totals on one side of a number, the number included', () => {
    expect(shown({ statTotal: { side: 'atMost', total: 330 } })).toEqual(['pup', 'mouse'])
    expect(shown({ statTotal: { side: 'atLeast', total: 540 } })).toEqual(['cerbère', 'titan'])
    expect(statTotalRange(pack)).toEqual({ min: 300, max: 660 })
  })

  it('find a name without its accents or capitals, and narrow with the other filters', () => {
    expect(shown({ search: 'CERBERE' })).toEqual(['cerbère'])
    expect(shown({ search: 'e', stage: 'final', type: 'electric' })).toEqual(['mouse'])
  })
})

describe('the filter by generation', () => {
  // One more Pokémon, from further on in the National Pokédex.
  const later: DataPack = { ...pack, species: { ...pack.species, wanderer: made('wanderer', 400, {}) } }
  const ofGeneration = (generation: number): string[] => speciesShown(later, { ...NO_FILTER, generation }, 'en').map((species) => species.id)

  it('keeps the Pokémon its National Pokédex number places in that generation', () => {
    expect(ofGeneration(generationOf(400))).toEqual(['wanderer'])
    expect(ofGeneration(generationOf(1))).toEqual(['pup', 'hound', 'cerbère', 'mouse', 'titan'])
  })

  it('offers the generations of a campaign’s species, each once, in order', () => {
    expect(generationsOffered(later, testRules({ species: ['wanderer', 'pup', 'hound'] }))).toEqual([generationOf(1), generationOf(400)])
    expect(generationsOffered(later, testRules({ species: ['hound', 'pup'] }))).toEqual([generationOf(1)])
  })
})

describe('the species a campaign offers', () => {
  // The test pack's own two: a mouse with moves from every source, and a golem that knows one.
  const offered = (filter: Partial<SpeciesFilter>, rules = testRules()): string[] => speciesOffered(testPack, rules, { ...NO_FILTER, ...filter }, 'en').map((species) => species.id)

  it('are the campaign’s own, in Pokédex order, whatever else the game data has', () => {
    expect(offered({})).toEqual(['sparkmouse', 'stonegolem'])
    expect(offered({}, testRules({ species: ['stonegolem'] }))).toEqual(['stonegolem'])
  })

  it('are narrowed to those that can have an Ability, a Hidden Ability included', () => {
    expect(offered({ ability: 'sturdy' })).toEqual(['stonegolem'])
    expect(offered({ ability: 'hiddenzap' })).toEqual(['sparkmouse'])
  })

  it('are narrowed to those that could choose a move as they are created', () => {
    expect(offered({ moves: ['tackle'] })).toEqual(['sparkmouse', 'stonegolem'])
    // Learned at level 10: not yet at level 5, within reach at level 10.
    expect(offered({ moves: ['spark'] })).toEqual([])
    expect(offered({ moves: ['spark'] }, testRules({ startingLevel: 10 }))).toEqual(['sparkmouse'])
  })

  it('are narrowed to those that could choose every one of several moves', () => {
    const atTen = testRules({ startingLevel: 10 })
    expect(offered({ moves: ['tackle'] }, atTen)).toEqual(['sparkmouse', 'stonegolem'])
    expect(offered({ moves: ['tackle', 'spark'] }, atTen)).toEqual(['sparkmouse'])
    expect(offered({ moves: ['tackle', 'spark', 'tmwave'] }, atTen)).toEqual([])
  })

  it('count a move from a TM or an egg only where the campaign allows those', () => {
    expect(offered({ moves: ['tmwave'] })).toEqual([])
    expect(offered({ moves: ['eggkick'] }, testRules({ moveAccess: 'level-up-tm-tutor-egg' }))).toEqual(['sparkmouse'])
  })

  it('do not count a move every species has through the campaign', () => {
    expect(offered({ moves: ['shared'] })).toEqual([])
  })
})

describe('whether a species can learn a move', () => {
  const mouse = testPack.species.sparkmouse
  if (!mouse) throw new Error('The test pack lost its first species')

  it('goes by its level and by where the campaign lets moves come from', () => {
    expect(canLearn(mouse, 'megabolt', { level: 39, access: 'level-up' })).toBe(false)
    expect(canLearn(mouse, 'megabolt', { level: 40, access: 'level-up' })).toBe(true)
    expect(canLearn(mouse, 'tmwave', { level: 1, access: 'level-up' })).toBe(false)
    expect(canLearn(mouse, 'tmwave', { level: 1, access: 'level-up-tm-tutor-egg' })).toBe(true)
    expect(canLearn(mouse, 'unknown', { level: 100, access: 'level-up-tm-tutor-egg' })).toBe(false)
  })
})

describe('what a campaign’s filters have to offer', () => {
  it('are the moves one of its species could choose, each once, without what the game data lacks', () => {
    expect(movesLearnable(testPack, testRules()).sort()).toEqual(['onechance', 'tackle'])
    expect(movesLearnable(testPack, testRules({ species: ['stonegolem'] }))).toEqual(['tackle'])
    expect(movesLearnable(testPack, testRules({ startingLevel: 10, moveAccess: 'level-up-tm-tutor-egg' })).sort()).toEqual(['eggkick', 'onechance', 'spark', 'tackle', 'tmwave'])
  })

  it('are the Abilities the game data has that one of its species can have', () => {
    // The test pack names Abilities on its species and holds none: nothing to offer.
    expect(abilitiesOffered(testPack, testRules())).toEqual([])
    const withAbilities = { ...testPack, abilities: { zap: { id: 'zap', name: { en: 'zap', fr: 'zap' }, description: { en: '', fr: '' } }, sturdy: { id: 'sturdy', name: { en: 'sturdy', fr: 'sturdy' }, description: { en: '', fr: '' } } } }
    expect(abilitiesOffered(withAbilities, testRules()).sort()).toEqual(['sturdy', 'zap'])
    expect(abilitiesOffered(withAbilities, testRules({ species: ['sparkmouse'] }))).toEqual(['zap'])
  })
})
