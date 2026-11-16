/**
 * The made-up pack of this folder's tests, with what a character's progress
 * needs: a line that evolves three ways, Abilities in every place, and items
 * that each do one thing. Nothing here is a real Pokémon, move or item.
 */
import type { DataPack, ItemData, SpeciesData } from '../data/types.ts'
import type { BagEffect } from '../game-rules/bag-effects.ts'
import { species, testPack } from './test-pack.ts'

const named = (id: string) => ({ en: id, fr: id })

function item(id: string, part: Partial<Pick<ItemData, 'holdable' | 'bag' | 'reusable' | 'ppUps' | 'evolution'>>): ItemData {
  return { id, name: named(id), description: named(id), icon: { from: 'showdown', index: 0 }, holdable: false, berry: false, ...part }
}
const bagItem = (id: string, bag: BagEffect): ItemData => item(id, { bag })

function theMouse(): SpeciesData {
  const mouse = testPack.species.sparkmouse
  if (!mouse) throw new Error('The test pack has lost its mouse')
  return mouse
}
const mouse = theMouse()

/** A later form of the mouse: the same moves and more HP, with the Abilities and the evolutions the test asks for. */
function form(id: string, num: number, abilities: string[], hiddenAbility: string | undefined, evolutions: SpeciesData['evolutions'] = []): SpeciesData {
  const made = species(id, num, { genders: ['M', 'F'], abilities, baseStats: { hp: 70, atk: 85, def: 60, spa: 80, spd: 80, spe: 110 }, learnset: [...mouse.learnset, { move: 'kept', level: 0 }] })
  return { ...made, evolutions, ...(hiddenAbility ? { hiddenAbility } : {}) }
}

export const progressPack: DataPack = {
  ...testPack,
  species: {
    ...testPack.species,
    // First place "zap", hidden place "hiddenzap"; it evolves from level 20.
    sparkmouse: { ...mouse, hiddenAbility: 'hiddenzap', evolutions: [{ to: 'sparkrat', method: 'level', level: 20 }] },
    // Two ordinary places and a hidden one; it evolves with a stone, with the cord, and into something the pack does not have.
    sparkrat: form('sparkrat', 4, ['zap', 'buzz', 'hiddenbuzz'], 'hiddenbuzz', [
      { to: 'sparklord', method: 'item', item: 'stone' },
      { to: 'sparkking', method: 'trade', item: 'cord' },
      { to: 'nowhere', method: 'level', level: 1 },
    ]),
    // One place only, and none hidden.
    sparklord: form('sparklord', 5, ['lordly'], undefined),
    sparkking: form('sparkking', 6, ['zap', 'hiddenking'], 'hiddenking'),
    // Two ordinary places, with other Abilities in them.
    sparkduke: form('sparkduke', 7, ['calm', 'storm'], undefined),
  },
  items: {
    ...testPack.items,
    tonic: bagItem('tonic', { heal: 20 }),
    draught: bagItem('draught', { heal: { fraction: 0.5 } }),
    cureall: bagItem('cureall', { heal: 'full', cure: 'all' }),
    salve: bagItem('salve', { cure: ['psn', 'tox'] }),
    ether: bagItem('ether', { restorePp: { amount: 10, scope: 'one' } }),
    elixir: bagItem('elixir', { restorePp: { amount: 'full', scope: 'all' } }),
    phoenix: bagItem('phoenix', { revive: 'half' }),
    sun: bagItem('sun', { revive: 'full' }),
    ash: bagItem('ash', { reviveAll: true }),
    flute: item('flute', { bag: { cure: ['slp'] }, reusable: true }),
    xpower: bagItem('xpower', { boost: { stat: 'atk', stages: 2 } }),
    ppup: item('ppup', { ppUps: 1 }),
    ppmax: item('ppmax', { ppUps: 3 }),
    stone: item('stone', { holdable: true, evolution: true }),
    cord: item('cord', { evolution: true }),
    charm: item('charm', { holdable: true }),
  },
}
