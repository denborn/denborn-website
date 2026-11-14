/**
 * Realistic characters and rules built from the real data pack, for
 * measuring code sizes (scripts/measure/code-sizes.ts) and for the design
 * board. The app itself never uses them.
 */
import type { DataPack } from '../data/types.ts'
import { expForLevel } from '../game-rules/exp.ts'
import type { CharacterDocument } from '../shared/schema/character.ts'
import type { CampaignRules } from '../shared/schema/rules.ts'

const even = { strength: 50, dexterity: 50, endurance: 50, perception: 50, charisma: 50, intelligence: 50 }
const zero = { strength: 0, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 }

export const SAMPLE_CAMPAIGN = { id: 'Hn4wB9cE2yU6sJ5d', name: 'Les Égarés de Denborn' }

/** A Charizard with the longest move names its species has, and `bagStacks` kinds of Bag item: a code's worst case at that size. */
export function sampleCharacter(pack: DataPack, level: number, nickname: string, moveCount: number, bagStacks: number): CharacterDocument {
  const species = pack.species.charizard
  if (!species) throw new Error('The data pack has no Charizard: run `pnpm data`.')
  const moves = species.learnset
    .map((entry) => entry.move)
    .sort((a, b) => b.length - a.length)
    .slice(0, moveCount)
  const bagItems = Object.values(pack.items)
    .filter((item) => item.bag)
    .map((item) => item.id)
  return {
    kind: 'denborn.character',
    schemaVersion: 1,
    id: 'q8Zr3vX1mK7pL0aT',
    revision: level,
    dataPackVersion: pack.version,
    campaign: { ...SAMPLE_CAMPAIGN, rulesVersion: 3 },
    species: species.id,
    nickname,
    gender: 'M',
    level,
    exp: expForLevel(level) + (level < 100 ? 137 : 0),
    nature: 'adamant',
    ability: species.abilities[0] ?? '',
    attributes: { creation: even, gained: { ...zero, strength: Math.min(level - 1, 45), charisma: Math.max(0, Math.min(level - 46, 45)) } },
    ivs: { hp: 31, atk: 31, def: 17, spa: 3, spd: 31, spe: 31 },
    evs: { hp: 6, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
    moves: moves.map((id, index) => ({ id, ppUps: index % 4, pp: 3 + index })),
    heldItem: 'choicescarf',
    bag: bagItems.slice(0, bagStacks).map((item, index) => ({ item, quantity: 1 + ((index * 37) % 99) })),
    money: 48_250,
    hp: 97,
    status: 'par',
    condition: { state: 'standing' },
  }
}

/** Rules offering the first `speciesCount` species, `commonMoves` common moves and `packs` item packs of `itemsPerPack` items. */
export function sampleRules(pack: DataPack, commonMoves: number, packs: number, itemsPerPack: number, speciesCount = 151): CampaignRules {
  const species = Object.values(pack.species)
    .sort((a, b) => a.num - b.num)
    .slice(0, speciesCount)
    .map((entry) => entry.id)
  const offered = Object.values(pack.moves)
    .filter((move) => move.supplement)
    .map((move) => move.id)
  const items = Object.keys(pack.items)
  return {
    version: 3,
    species,
    startingLevel: 5,
    startingMoney: 3000,
    natures: 'chosen',
    moveAccess: 'level-up-tm-tutor-egg',
    commonMoves: offered.slice(0, commonMoves),
    itemPacks: Array.from({ length: packs }, (_, index) => ({
      name: `Sac d’aventurier ${index + 1}`,
      items: items.slice(index * itemsPerPack, (index + 1) * itemsPerPack).map((item, at) => ({ item, quantity: 1 + at })),
    })),
  }
}
