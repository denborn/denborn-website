/**
 * Everything in effect on the battlefield, as the plan and its MORE list show
 * it (decisions 89 and 92 to 94): the terrain and the weather, named between
 * the two lines; then the rooms, each side's conditions, and what sits on one
 * Pokémon. Names and what each says it does are the games' own (decision 154).
 */
import type { FieldView } from '../../battle/contract'
import type { BattleText } from '../../data/battle-text'
import type { LineSide } from '../../game-rules/reach'
import type { FieldEffect } from '../../ui'
import type { Fighter } from './fighters'

/** The type whose two colours draw the label of a terrain or a weather. */
const COLOUR: Record<string, string> = {
  electricterrain: 'Electric',
  grassyterrain: 'Grass',
  mistyterrain: 'Fairy',
  psychicterrain: 'Psychic',
  raindance: 'Water',
  sunnyday: 'Fire',
  sandstorm: 'Rock',
  snowscape: 'Ice',
}

export interface EffectWords {
  language: 'en' | 'fr'
  states: BattleText['states']
  /** Denborn's own words for what an effect does, where its fights differ from what the games say (decision 157). */
  own: Readonly<Record<string, string>>
  /** A stat's name, for a stat change. */
  statName: (stat: string) => string
  turnsLeft: (turns: number) => string
  /** Whom an effect touches, in words. */
  scope: { field: string; foes: string; party: string }
  /** A Pokémon named with its place: "B: Arcanine". */
  slot: (letter: string, name: string) => string
}

/** The ground and the sky: the terrain, then the weather, each with the type that colours its label. */
export function groundOf(field: FieldView, words: EffectWords): { id: string; type: string; name: string }[] {
  return [field.terrain, field.weather].flatMap((effect) => {
    const state = effect ? words.states[effect.id] : undefined
    return effect && state ? [{ id: effect.id, type: COLOUR[effect.id] ?? 'Normal', name: state.name[words.language] }] : []
  })
}

const signed = (stages: number): string => (stages > 0 ? `+${stages}` : `${stages}`)

/**
 * The whole list, for a viewer on the players' side: what holds over the
 * field, what is on the foes' side, what is on the party's, then each
 * Pokémon's own, the foes first. An effect the games have no name for is the
 * engine's own bookkeeping and is not listed.
 */
export function effectsOf(field: FieldView, fighters: readonly Fighter[], words: EffectWords): FieldEffect[] {
  const entry = (effect: FieldView['rooms'][number], scope: FieldEffect['scope'], who?: { letter: string; scopeText: string }): FieldEffect[] => {
    const state = words.states[effect.id]
    if (!state) return []
    const name = state.name[words.language]
    return [
      {
        id: `${scope}-${who?.letter ?? ''}-${effect.id}`,
        name: effect.layers !== undefined && effect.layers > 1 ? `${name} ×${effect.layers}` : name,
        scope,
        scopeText: who?.scopeText ?? words.scope[scope],
        ...(who ? { letter: who.letter } : {}),
        ...(effect.turns === undefined ? {} : { lasting: words.turnsLeft(effect.turns) }),
        description: words.own[effect.id] ?? state.text[words.language],
      },
    ]
  }
  const sideOf = (line: LineSide): FieldEffect['scope'] => (line === 'enemies' ? 'foes' : 'party')
  const carried = (fighter: Fighter): FieldEffect[] => {
    const scope = sideOf(fighter.side)
    const who = { letter: fighter.letter, scopeText: `${words.scope[scope]}, ${words.slot(fighter.letter, fighter.name)}` }
    const stages = Object.entries(fighter.now.boosts).map(([stat, stage]) => `${words.statName(stat)} ${signed(stage)}`)
    return [
      ...(stages.length > 0 ? [{ id: `${scope}-${fighter.letter}-stats`, name: stages.join(' · '), scope, ...who }] : []),
      ...(field.pokemon[fighter.id] ?? []).flatMap((effect) => entry(effect, scope, who)),
    ]
  }
  const standing = (line: LineSide): Fighter[] => fighters.filter((fighter) => fighter.side === line && fighter.state !== 'gone')
  return [
    ...[field.terrain, field.weather, ...field.rooms].flatMap((effect) => (effect ? entry(effect, 'field') : [])),
    ...field.sides.enemies.flatMap((effect) => entry(effect, 'foes')),
    ...field.sides.players.flatMap((effect) => entry(effect, 'party')),
    ...standing('enemies').flatMap(carried),
    ...standing('players').flatMap(carried),
  ]
}
