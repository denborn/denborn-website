/** A party made up for the board, built the way the app builds characters. Never part of the app. */
import type { DataPack } from '../../data/types'
import { maxHpOf } from '../../domain/character-check'
import { sampleCharacter } from '../../domain/samples'
import { expForLevel } from '../../game-rules/exp'
import { maxPp } from '../../game-rules/pp'
import type { CharacterDocument } from '../../shared/schema/character'
import type { CampaignRules } from '../../shared/schema/rules'
import { type DraftChoice, choose, movesOffered } from '../creation/draft'
import { enemyContext, enemyOf, newEnemy } from '../encounters/encounter-draft'

/** A character of that species and level, with up to six of the moves it may know and a few things in its bag. */
export function sampleHero(pack: DataPack, rules: CampaignRules, id: string, species: string, level: number, nickname: string): CharacterDocument {
  const context = enemyContext(rules, pack, level)
  const data = pack.species[species]
  let build = choose(newEnemy(id, rules).build, { choose: 'species', species }, context)
  const choices: DraftChoice[] = [
    { choose: 'gender', gender: data?.genders[0] ?? 'N' },
    { choose: 'nature', nature: 'jolly' },
    { choose: 'ability', ability: data?.abilities[0] ?? '' },
    ...movesOffered(build, context)
      .slice(-6)
      .map((move): DraftChoice => ({ choose: 'move', move })),
  ]
  for (const choice of choices) build = choose(build, choice, context)
  const made = enemyOf({ id, level, class: 'minion', agony: false, build }, rules)
  if (!made) throw new Error(`The board's ${species} could not be built`)

  const base = sampleCharacter(pack, level, nickname, 1, 0)
  const character: CharacterDocument = {
    ...base,
    id,
    species: made.species,
    gender: made.gender,
    exp: expForLevel(level),
    ability: made.ability,
    ivs: made.ivs,
    evs: made.evs,
    moves: made.moves.map((slot) => {
      const move = pack.moves[slot.id]
      return { id: slot.id, ppUps: 0, pp: move ? maxPp(move.pp, 0, move.fixedPp) : 1 }
    }),
    bag: ['potion', 'ether', 'fullheal', 'revive'].filter((item) => pack.items[item]?.bag).map((item, index) => ({ item, quantity: 3 - (index % 2) })),
    hp: 1,
  }
  if (made.nature) character.nature = made.nature
  delete character.status
  delete character.heldItem
  return { ...character, hp: maxHpOf(character, pack) ?? 1 }
}
