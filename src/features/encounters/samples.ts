/** Encounters made up for the board, built the way the editor builds them. Never part of the app. */
import type { DataPack } from '../../data/types'
import type { MobClass } from '../../game-rules/rewards'
import type { Encounter, Enemy } from '../../shared/schema/encounter'
import type { CampaignRules } from '../../shared/schema/rules'
import { type DraftChoice, choose, movesOffered } from '../creation/draft'
import { enemyContext, enemyOf, newEnemy } from './encounter-draft'

/** An enemy made the way the editor makes one: the species, then the first gender, Ability and moves it offers. */
export function sampleEnemy(pack: DataPack, rules: CampaignRules, id: string, species: string, level: number, mobClass: MobClass, agony: boolean, nickname = ''): Enemy {
  const context = enemyContext(rules, pack, level)
  const data = pack.species[species]
  let build = choose(newEnemy(id, rules).build, { choose: 'species', species }, context)
  const choices: DraftChoice[] = [
    { choose: 'nickname', nickname },
    { choose: 'gender', gender: data?.genders[0] ?? 'N' },
    { choose: 'nature', nature: 'adamant' },
    { choose: 'ability', ability: data?.abilities[0] ?? '' },
    ...movesOffered(build, context)
      .slice(0, 3)
      .map((move): DraftChoice => ({ choose: 'move', move })),
  ]
  for (const choice of choices) build = choose(build, choice, context)
  const enemy = enemyOf({ id, level, class: mobClass, agony, build, ppUps: {} }, rules)
  if (!enemy) throw new Error(`The board's ${species} could not be built`)
  return enemy
}

/** A boss that agonizes between two minions, with a Bag. */
export function sampleQuarry(pack: DataPack, rules: CampaignRules): Encounter {
  return {
    id: 'encounter-quarry',
    name: 'La carrière',
    enemies: [
      sampleEnemy(pack, rules, 'enemy-geodude-1', 'geodude', 12, 'minion', false),
      sampleEnemy(pack, rules, 'enemy-onix-0001', 'onix', 18, 'boss', true, 'Vieux Roc'),
      sampleEnemy(pack, rules, 'enemy-geodude-2', 'geodude', 12, 'minion', false),
    ],
    bag: [{ item: 'potion', quantity: 2 }],
  }
}

/** A lone minion. */
export function sampleFord(pack: DataPack, rules: CampaignRules): Encounter {
  return { id: 'encounter-river', name: 'Le gué', enemies: [sampleEnemy(pack, rules, 'enemy-psyduck-1', 'psyduck', 9, 'minion', false)], bag: [] }
}
