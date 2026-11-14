/**
 * A made-up data pack and a made-up campaign for the tests of this folder.
 * Nothing here is a real Pokémon, move or item: the tests are about our
 * checks, not about the games' data.
 */
import type { DataPack, ItemData, MoveData, SpeciesData } from '../data/types.ts'
import { expForLevel } from '../game-rules/exp.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'
import { maxHpOf } from './character-check.ts'

const named = (id: string) => ({ en: id, fr: id })

function species(id: string, part: Pick<SpeciesData, 'genders' | 'abilities' | 'baseStats' | 'learnset'>): SpeciesData {
  return { id, num: 1, name: named(id), types: ['Normal'], baseExp: 50, tags: [], earlierStages: [], evolutions: [], sprite: null, femaleSprite: false, ...part }
}

function move(id: string, pp: number, part: Partial<Pick<MoveData, 'fixedPp' | 'supplement'>> = {}): MoveData {
  return { id, name: named(id), description: named(id), type: 'Normal', category: 'Physical', power: 40, accuracy: 100, pp, fixedPp: false, priority: 0, target: 'normal', supplement: false, ...part }
}

function item(id: string, holdable: boolean): ItemData {
  return { id, name: named(id), description: named(id), icon: { from: 'showdown', index: 0 }, holdable, berry: false }
}

export const testPack: DataPack = {
  version: 'test-pack',
  sources: { engine: 'test', pokeapi: 'test' },
  species: {
    sparkmouse: species('sparkmouse', {
      genders: ['M', 'F'],
      abilities: ['zap', 'hiddenzap'],
      baseStats: { hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90 },
      learnset: [
        { move: 'tackle', level: 1 },
        { move: 'spark', level: 10 },
        { move: 'megabolt', level: 40 },
        { move: 'onechance', level: 1 },
        { move: 'tmwave', tm: true },
        { move: 'eggkick', egg: true },
      ],
    }),
    stonegolem: species('stonegolem', {
      genders: ['N'],
      abilities: ['sturdy'],
      baseStats: { hp: 80, atk: 110, def: 130, spa: 55, spd: 65, spe: 45 },
      learnset: [{ move: 'tackle', level: 1 }],
    }),
  },
  moves: {
    tackle: move('tackle', 35),
    spark: move('spark', 20),
    megabolt: move('megabolt', 5),
    onechance: move('onechance', 1, { fixedPp: true }),
    tmwave: move('tmwave', 20),
    eggkick: move('eggkick', 15),
    shared: move('shared', 10, { supplement: true }),
    kept: move('kept', 10),
  },
  abilities: {},
  items: { berry: item('berry', true), potion: item('potion', false), rope: item('rope', false) },
  natures: { bold: { id: 'bold', name: named('bold'), plus: 'def', minus: 'atk' }, plain: { id: 'plain', name: named('plain') } },
  types: {},
  statNames: { hp: named('hp'), atk: named('atk'), def: named('def'), spa: named('spa'), spd: named('spd'), spe: named('spe') },
}

export function testRules(changes: Partial<CampaignRules> = {}): CampaignRules {
  return {
    version: 1,
    species: ['sparkmouse', 'stonegolem'],
    startingLevel: 5,
    startingMoney: 500,
    natures: 'chosen',
    moveAccess: 'level-up',
    commonMoves: ['shared'],
    itemPacks: [
      {
        name: 'Explorer',
        items: [
          { item: 'potion', quantity: 3 },
          { item: 'berry', quantity: 1 },
        ],
      },
      { name: 'Climber', items: [{ item: 'rope', quantity: 1 }] },
    ],
    ...changes,
  }
}

const even = { strength: 50, dexterity: 50, endurance: 50, perception: 50, charisma: 50, intelligence: 50 }
const none = { strength: 0, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 }
const zero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

/** A character just created under `testRules()`, valid in every respect, then changed as asked. */
export function newcomer(changes: Partial<CharacterDocument> = {}): CharacterDocument {
  const character: CharacterDocument = {
    kind: 'denborn.character',
    schemaVersion: 1,
    id: 'character-0001',
    revision: 0,
    dataPackVersion: testPack.version,
    campaign: { id: 'campaign-0001', name: 'Test', rulesVersion: 1 },
    species: 'sparkmouse',
    nickname: 'Volt',
    gender: 'F',
    level: 5,
    exp: expForLevel(5),
    nature: 'bold',
    ability: 'zap',
    attributes: { creation: even, gained: none },
    ivs: zero,
    evs: zero,
    moves: [{ id: 'tackle', ppUps: 0, pp: 35 }],
    heldItem: 'berry',
    bag: [{ item: 'potion', quantity: 3 }],
    money: 500,
    hp: 0,
    condition: { state: 'standing' },
    ...changes,
  }
  // Full HP for whatever species, level and points the test asked for, unless it set the HP itself.
  return changes.hp === undefined ? { ...character, hp: maxHpOf(character, testPack) ?? 1 } : character
}
