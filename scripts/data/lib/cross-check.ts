/**
 * Compares what Showdown and PokéAPI both state about the playable species
 * and the pack's moves, and returns the disagreements. Showdown's value is the
 * one the battle runs on; the list is for the owner to rule on.
 */
import { Dex } from '@pkmn/dex'
import type { DataPack, StatId } from '../../../src/data/types.ts'
import { type PokeapiLock, type Row, readTable } from './pokeapi.ts'
import { toId } from './texts.ts'

const STAT_OF: Record<string, StatId> = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
}

function group(rows: readonly Row[], column: string): Map<string, Row[]> {
  const out = new Map<string, Row[]>()
  for (const row of rows) {
    const key = row[column] ?? ''
    out.set(key, [...(out.get(key) ?? []), row])
  }
  return out
}

export async function crossCheck(pack: DataPack, lock: PokeapiLock): Promise<string[]> {
  const read = (table: Parameters<typeof readTable>[1]) => readTable(lock, table)
  const identifier = async (table: Parameters<typeof readTable>[1]) =>
    new Map((await read(table)).map((row) => [row.id ?? '', row.identifier ?? '']))

  const typeIds = await identifier('types')
  const statIds = await identifier('stats')
  const abilityIds = await identifier('abilities')
  const classIds = await identifier('move_damage_classes')
  const typesOf = group(await read('pokemon_types'), 'pokemon_id')
  const statsOf = group(await read('pokemon_stats'), 'pokemon_id')
  const abilitiesOf = group(await read('pokemon_abilities'), 'pokemon_id')
  const speciesRows = new Map((await read('pokemon_species')).map((row) => [row.id ?? '', row]))

  const differences: string[] = []
  const differ = (what: string, showdown: unknown, pokeapi: unknown): void => {
    if (JSON.stringify(showdown) !== JSON.stringify(pokeapi)) {
      differences.push(`${what}: Showdown ${JSON.stringify(showdown)}, PokéAPI ${JSON.stringify(pokeapi)}`)
    }
  }

  for (const species of Object.values(pack.species)) {
    // For a base form, PokéAPI's Pokémon id is the Pokédex number.
    const id = String(species.num)
    const name = species.name.en

    const types = (typesOf.get(id) ?? [])
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((row) => typeIds.get(row.type_id ?? '') ?? '')
    differ(`${name}, types`, species.types.map((type) => type.toLowerCase()), types)

    const stats = Object.fromEntries(
      (statsOf.get(id) ?? []).map((row) => [STAT_OF[statIds.get(row.stat_id ?? '') ?? ''] ?? '?', Number(row.base_stat)]),
    )
    for (const stat of Object.keys(species.baseStats) as StatId[]) {
      differ(`${name}, base ${stat}`, species.baseStats[stat], stats[stat])
    }

    const abilityRows = abilitiesOf.get(id) ?? []
    const all = abilityRows.map((row) => toId(abilityIds.get(row.ability_id ?? '') ?? '')).sort()
    const hidden = abilityRows.filter((row) => row.is_hidden === '1').map((row) => toId(abilityIds.get(row.ability_id ?? '') ?? ''))
    differ(`${name}, Abilities`, [...species.abilities].sort(), all)
    differ(`${name}, Hidden Ability`, species.hiddenAbility ?? null, hidden[0] ?? null)

    // PokéAPI: -1 for genderless, otherwise the share of females in eighths.
    const rate = Number(speciesRows.get(id)?.gender_rate)
    const expected = rate < 0 ? 'genderless' : `${(rate / 8) * 100}% female`
    const actual =
      species.genders.join() === 'N'
        ? 'genderless'
        : `${(species.genderRatio ? species.genderRatio.F : species.genders[0] === 'F' ? 1 : 0) * 100}% female`
    differ(`${name}, gender`, actual, expected)
  }

  const moveRows = await read('moves')
  const moveByName = new Map(moveRows.map((row) => [toId(row.identifier ?? ''), row]))
  for (const move of Object.values(pack.moves)) {
    const row = moveByName.get(move.id)
    if (!row) continue
    const name = move.name.en
    // Showdown keeps the last values a move had; so does PokéAPI's main table.
    differ(`${name}, type`, move.type.toLowerCase(), typeIds.get(row.type_id ?? ''))
    differ(`${name}, category`, move.category.toLowerCase(), classIds.get(row.damage_class_id ?? ''))
    differ(`${name}, PP`, move.pp, Number(row.pp))
    differ(`${name}, priority`, move.priority, Number(row.priority))
    differ(`${name}, power`, move.power, row.power === '' ? 0 : Number(row.power))
    differ(`${name}, accuracy`, move.accuracy, row.accuracy === '' ? true : Number(row.accuracy))
  }

  // Sanity: the comparison must really have covered the data.
  if (Dex.species.get('bulbasaur').num !== 1) throw new Error('Unexpected Pokédex numbering')
  return differences
}
