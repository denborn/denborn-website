/**
 * The names of the engine's classes.
 *
 * The engine writes them into a kept battle, as references such as
 * "[Pokemon:p1a]" or "[Condition:brn]", and reads them back by name. A
 * production build shortens class names, and a battle kept by such a build
 * could not be taken up again. Each class is therefore given back the name it
 * has in the engine's own source, whatever the build made of it.
 *
 * Engine: State.toRef and State.fromRef. A test checks these names against
 * the engine as installed.
 */
import { Battle, Pokemon, Side } from '@pkmn/sim'

/** The classes the engine refers to by name in a kept battle, each with its name in the engine's source. */
export function engineClassNames(battle: Battle): [constructor: object, name: string][] {
  const { dex } = battle
  return [
    [Battle, 'Battle'],
    [battle.field.constructor, 'Field'],
    [Side, 'Side'],
    [Pokemon, 'Pokemon'],
    [dex.conditions.get('brn').constructor, 'Condition'],
    [dex.abilities.get('static').constructor, 'Ability'],
    [dex.items.get('leftovers').constructor, 'Item'],
    [dex.moves.get('tackle').constructor, 'DataMove'],
    [dex.species.get('pikachu').constructor, 'Species'],
  ]
}

export function keepEngineClassNames(battle: Battle): void {
  for (const [constructor, name] of engineClassNames(battle)) Object.defineProperty(constructor, 'name', { value: name, configurable: true })
}
