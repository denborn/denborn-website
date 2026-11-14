/**
 * Builds the game data pack from the pinned engine packages and the pinned
 * PokéAPI tables.
 *
 * Game facts (stats, types, moves, learnsets, Abilities, held items) come from
 * Showdown's data through @pkmn/dex. PokéAPI gives what Showdown lacks: French
 * names, the games' texts, Bag items, base EXP. The project's own table says
 * what each Bag item does.
 *
 * Anything missing or contradictory is collected as a problem; the caller
 * stops the build when there is one. Nothing is dropped or guessed silently.
 */
import { Dex, type Move } from '@pkmn/dex'
import { Dex as SimDex } from '@pkmn/sim'
import type {
  AbilityData,
  DataPack,
  Evolution,
  Gender,
  ItemData,
  MoveData,
  NatureData,
  SpeciesData,
  StatId,
  TypeData,
} from '../../../src/data/types.ts'
import type { MoveAccess } from '../../../src/game-rules/eligibility.ts'
import { isEligible } from '../../../src/game-rules/eligibility.ts'
import { mergeStages } from '../../../src/game-rules/learnset.ts'
import { type BagTable, readBagTable } from './bag-table.ts'
import { ROOT, readJson, sha256, stableJson } from './pinned.ts'
import { type PokeapiLock, type Row, ensurePokeapi, readTable } from './pokeapi.ts'
import { type Localized, loadTexts, toId } from './texts.ts'

const LAST_SPECIES = 151
const STATS: readonly StatId[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
/** PokéAPI's item categories that hold Bag items (kickoff prompt: healing, PP recovery, revival, status cures, X items). */
const BAG_CATEGORIES = ['healing', 'pp-recovery', 'revival', 'status-cures', 'stat-boosts']
/** Left out by owner decisions: 59 (Return, Frustration). */
const EXCLUDED_MOVES = new Set(['return', 'frustration'])
/** Flags under which a move is still a real main-series move (decision 71). */
const REAL_MOVE_FLAGS = new Set([null, 'Past', 'Unobtainable'])
const ALL_ACCESS: readonly MoveAccess[] = ['level-up', 'level-up-tm-tutor-egg']

/** Owner rulings on what the sources lack or disagree on (data-sources/rulings.json). */
interface Rulings {
  frenchNames?: Partial<Record<'moves' | 'abilities' | 'items' | 'species' | 'natures' | 'types', Record<string, string>>>
  /** Descriptions for things neither source describes, by item id. */
  itemDescriptions?: Record<string, { en: string; fr: string }>
}

/** The files the app shows, with their checksums (data-sources/sprites.lock.json). */
interface SpriteLock {
  showdown: { files: Record<string, string> }
  pokeapi: { files: Record<string, string> }
}

export interface BuildResult {
  pack: DataPack
  problems: string[]
  /** Things worth the owner's eye that do not stop the build. */
  notes: string[]
  lock: PokeapiLock
}

function indexBy(rows: readonly Row[], column: string): Map<string, Row> {
  return new Map(rows.map((row) => [row[column] ?? '', row]))
}

export async function buildDataPack(): Promise<BuildResult> {
  const problems: string[] = []
  const notes: string[] = []
  const lock = await ensurePokeapi()
  const texts = await loadTexts(lock)
  const bagTable: BagTable = await readBagTable()
  const rulings = await readJson<Rulings>(`${ROOT}data-sources/rulings.json`)
  const sprites = await readJson<SpriteLock>(`${ROOT}data-sources/sprites.lock.json`)
  const engineVersion = (await readJson<{ version: string }>(`${ROOT}node_modules/@pkmn/dex/package.json`)).version

  /** Looks a Showdown thing up in a PokéAPI name table by its English name, and returns both names. */
  async function nameFinder(kind: keyof NonNullable<Rulings['frenchNames']>, table: Parameters<typeof texts.names>[0], idColumn: string) {
    const names = await texts.names(table, idColumn)
    const byEnglish = new Map<string, string>()
    for (const [id, name] of names) if (name.en) byEnglish.set(toId(name.en), id)
    return {
      names,
      /** PokéAPI's row id for a Showdown id, if PokéAPI knows the thing. */
      rowId: (showdownId: string): string | undefined => byEnglish.get(showdownId),
      localized(showdownId: string, english: string, rowId = byEnglish.get(showdownId)): Localized {
        const french = rulings.frenchNames?.[kind]?.[showdownId] ?? (rowId ? names.get(rowId)?.fr : undefined)
        if (!french) problems.push(`No French name for the ${kind.replace(/s$/, '')} "${english}" (${showdownId})`)
        return { en: english, fr: french ?? english }
      },
    }
  }

  // -------------------------------------------------------------------------
  // Species
  // -------------------------------------------------------------------------
  const speciesNames = await texts.names('pokemon_species_names', 'pokemon_species_id')
  const pokemonRows = (await readTable(lock, 'pokemon')).filter((row) => row.is_default === '1')
  const baseExp = new Map(pokemonRows.map((row) => [row.species_id ?? '', Number(row.base_experience)]))

  const playable = Dex.species
    .all()
    .filter((entry) => entry.num >= 1 && entry.num <= LAST_SPECIES && !entry.forme)
    .sort((a, b) => a.num - b.num)
  if (playable.length !== LAST_SPECIES) problems.push(`Expected ${LAST_SPECIES} base species, found ${playable.length}`)
  const playableIds = new Set(playable.map((entry) => entry.id))

  const species: Record<string, SpeciesData> = {}
  const usedMoves = new Set<string>()
  const usedAbilities = new Set<string>()
  const evolutionItems = new Set<string>()

  for (const entry of playable) {
    const earlierStages: string[] = []
    let prevo: string | undefined = entry.prevo
    while (prevo) {
      const stage = Dex.species.get(prevo)
      earlierStages.push(stage.id)
      prevo = stage.prevo
    }

    const stages = await Promise.all(
      [entry.id, ...earlierStages].map(async (id) => (await Dex.learnsets.get(id)).learnset ?? {}),
    )
    const learnset = mergeStages(stages).filter((move) => !EXCLUDED_MOVES.has(move.move))
    for (const move of learnset) usedMoves.add(move.move)

    // The two regular slots, the Hidden Ability and a special one, when the species has them.
    const slots = [entry.abilities[0], entry.abilities[1], entry.abilities.H, entry.abilities.S]
    const abilities = slots.flatMap((name) => (name ? [Dex.abilities.get(name).id] : []))
    for (const id of abilities) usedAbilities.add(id)
    const hidden = entry.abilities.H ? Dex.abilities.get(entry.abilities.H).id : undefined

    const evolutions: Evolution[] = []
    for (const name of entry.evos ?? []) {
      const target = Dex.species.get(name)
      if (!playableIds.has(target.id)) continue
      if (!target.evoType) {
        if (!target.evoLevel) problems.push(`${entry.name} evolves into ${target.name} at no stated level`)
        evolutions.push({ to: target.id, method: 'level', level: target.evoLevel ?? 0 })
      } else if (target.evoType === 'useItem' && target.evoItem) {
        const item = toId(target.evoItem)
        evolutionItems.add(item)
        evolutions.push({ to: target.id, method: 'item', item })
      } else if (target.evoType === 'trade' && !target.evoItem) {
        evolutions.push({ to: target.id, method: 'trade', item: 'linkingcord' })
      } else {
        problems.push(`${entry.name} evolves into ${target.name} by "${target.evoType}", which no decision covers`)
      }
    }

    const genders: Gender[] = entry.gender ? [entry.gender] : ['M', 'F']
    const french = rulings.frenchNames?.species?.[entry.id] ?? speciesNames.get(String(entry.num))?.fr
    if (!french) problems.push(`No French name for the species ${entry.name}`)
    const exp = baseExp.get(String(entry.num))
    if (!exp) problems.push(`No base EXP for ${entry.name}`)

    const data: SpeciesData = {
      id: entry.id,
      num: entry.num,
      name: { en: entry.name, fr: french ?? entry.name },
      types: [...entry.types],
      baseStats: { ...entry.baseStats },
      abilities,
      genders,
      baseExp: exp ?? 0,
      tags: [...entry.tags],
      earlierStages,
      evolutions,
      learnset,
      sprite: null,
      femaleSprite: false,
    }
    // Gen 5 animated sprites first, Showdown's "ani" set when a species has none.
    const pinned = (set: string, suffix = ''): boolean =>
      `${set}/${entry.id}${suffix}.gif` in sprites.showdown.files && `${set}-back/${entry.id}${suffix}.gif` in sprites.showdown.files
    data.sprite = pinned('gen5ani') ? 'gen5ani' : pinned('ani') ? 'ani' : null
    if (data.sprite) data.femaleSprite = pinned(data.sprite, '-f')
    else problems.push(`No battle sprite pinned for ${entry.name}`)
    if (hidden) data.hiddenAbility = hidden
    if (!entry.gender) data.genderRatio = { M: entry.genderRatio.M, F: entry.genderRatio.F }
    species[entry.id] = data

    for (const access of ALL_ACCESS) {
      for (let level = 1; level <= 100; level++) {
        if (!learnset.some((move) => isEligible(move, level, access))) {
          problems.push(`${entry.name} has no eligible move at level ${level} under "${access}"`)
          break
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Moves
  // -------------------------------------------------------------------------
  const moveNames = await nameFinder('moves', 'move_names', 'move_id')
  const moveTexts = await texts.flavor('move_flavor_text', 'move_id')

  const inSupplement = (move: Move): boolean =>
    move.exists &&
    move.num > 0 &&
    !move.isZ &&
    !move.isMax &&
    REAL_MOVE_FLAGS.has(move.isNonstandard ?? null) &&
    !EXCLUDED_MOVES.has(move.id) &&
    move.id !== 'struggle' &&
    // Hidden Power is one move; Showdown's typed variants are not separate moves.
    !(move.id.startsWith('hiddenpower') && move.id !== 'hiddenpower')

  const moves: Record<string, MoveData> = {}
  const supplement = Dex.moves.all().filter(inSupplement)
  const moveIds = [...new Set([...usedMoves, ...supplement.map((move) => move.id)])].sort()
  for (const id of moveIds) {
    const move = Dex.moves.get(id)
    if (!move.exists) {
      problems.push(`A learnset refers to the move "${id}", which the engine does not have`)
      continue
    }
    const rowId = moveNames.rowId(id)
    const text = rowId ? moveTexts.get(rowId) : undefined
    if (!text?.fr) notes.push(`No French in-game text for the move ${move.name}; its description falls back to English`)
    const english = move.shortDesc || move.desc
    if (!english) problems.push(`No description for the move ${move.name}`)
    moves[id] = {
      id,
      name: moveNames.localized(id, move.name),
      description: { en: english, fr: text?.fr ?? english },
      type: move.type,
      category: move.category,
      power: move.basePower,
      accuracy: move.accuracy,
      pp: move.pp,
      fixedPp: Boolean(move.noPPBoosts),
      priority: move.priority,
      target: move.target,
      supplement: inSupplement(move),
    }
    const sim = SimDex.moves.get(id)
    const same =
      sim.type === move.type &&
      sim.category === move.category &&
      sim.basePower === move.basePower &&
      sim.accuracy === move.accuracy &&
      sim.pp === move.pp &&
      sim.priority === move.priority &&
      sim.target === move.target
    if (!same) problems.push(`The move ${move.name} differs between @pkmn/dex and @pkmn/sim`)
  }

  // -------------------------------------------------------------------------
  // Abilities
  // -------------------------------------------------------------------------
  const abilityNames = await nameFinder('abilities', 'ability_names', 'ability_id')
  const abilityTexts = await texts.flavor('ability_flavor_text', 'ability_id')
  const abilities: Record<string, AbilityData> = {}
  for (const id of [...usedAbilities].sort()) {
    const ability = Dex.abilities.get(id)
    if (!ability.exists) {
      problems.push(`A species refers to the Ability "${id}", which the engine does not have`)
      continue
    }
    const rowId = abilityNames.rowId(id)
    const text = rowId ? abilityTexts.get(rowId) : undefined
    if (!text?.fr) notes.push(`No French in-game text for the Ability ${ability.name}; its description falls back to English`)
    const english = ability.shortDesc || ability.desc
    abilities[id] = {
      id,
      name: abilityNames.localized(id, ability.name),
      description: { en: english, fr: text?.fr ?? english },
    }
  }

  for (const entry of playable) {
    const sim = SimDex.species.get(entry.id)
    const same =
      sim.types.join() === entry.types.join() &&
      STATS.every((stat) => sim.baseStats[stat] === entry.baseStats[stat]) &&
      Object.values(sim.abilities).join() === Object.values(entry.abilities).join()
    if (!same) problems.push(`The species ${entry.name} differs between @pkmn/dex and @pkmn/sim`)
  }

  // -------------------------------------------------------------------------
  // Items
  // -------------------------------------------------------------------------
  const itemRows = await readTable(lock, 'items')
  const itemByIdentifier = indexBy(itemRows, 'identifier')
  const categories = indexBy(await readTable(lock, 'item_categories'), 'id')
  const itemNames = await nameFinder('items', 'item_names', 'item_id')
  const itemTexts = await texts.flavor('item_flavor_text', 'item_id')
  const englishProse = new Set(
    (await readTable(lock, 'item_prose')).filter((row) => row.local_language_id === texts.language.en).map((row) => row.item_id),
  )
  const items: Record<string, ItemData> = {}

  // Held items and Berries: Showdown's, without Poké Balls and without anything it flags as nonstandard.
  for (const item of Dex.items.all().filter((entry) => entry.exists && !entry.isPokeball && !entry.isNonstandard)) {
    const rowId = itemNames.rowId(item.id)
    const text = rowId ? itemTexts.get(rowId) : undefined
    const english = item.shortDesc || item.desc
    const icon = SimDex.items.get(item.id).spritenum
    if (icon === undefined) problems.push(`No icon number for the item ${item.name}`)
    if (!text?.fr) notes.push(`No French in-game text for the item ${item.name}; its description falls back to English`)
    items[item.id] = {
      id: item.id,
      name: itemNames.localized(item.id, item.name),
      description: { en: english, fr: text?.fr ?? english },
      icon: { from: 'showdown', index: icon ?? 0 },
      holdable: true,
      berry: Boolean(item.isBerry),
    }
  }

  /** Adds or completes an item that comes from PokéAPI's tables. */
  function pokeapiItem(identifier: string): ItemData | undefined {
    const row = itemByIdentifier.get(identifier)
    if (!row?.id) {
      problems.push(`data-sources/bag-effects.json names "${identifier}", which PokéAPI does not have`)
      return undefined
    }
    const names = itemNames.names.get(row.id)
    if (!names?.en) {
      problems.push(`No English name for PokéAPI's item "${identifier}"`)
      return undefined
    }
    const id = toId(names.en)
    const existing = items[id]
    if (existing) return existing
    const text = rulings.itemDescriptions?.[id] ?? itemTexts.get(row.id)
    if (!text?.en) problems.push(`No English description for the item ${names.en}`)
    if (!text?.fr) problems.push(`No French description for the item ${names.en}`)
    if (!(`sprites/items/${identifier}.png` in sprites.pokeapi.files)) problems.push(`No icon pinned for the item ${names.en}`)
    const created: ItemData = {
      id,
      name: itemNames.localized(id, names.en, row.id),
      // Showdown has no such item, so both languages use the games' own text.
      description: { en: text?.en ?? '', fr: text?.fr ?? text?.en ?? '' },
      icon: { from: 'pokeapi', file: identifier },
      holdable: false,
      berry: false,
    }
    items[id] = created
    return created
  }

  for (const [identifier, effect] of Object.entries(bagTable.effects)) {
    const item = pokeapiItem(identifier)
    if (item) item.bag = effect
  }
  for (const [identifier, ppUps] of Object.entries(bagTable.ppUps)) {
    const item = pokeapiItem(identifier)
    if (item) item.ppUps = ppUps
  }
  for (const identifier of bagTable.evolution) {
    const item = pokeapiItem(identifier)
    if (item) item.evolution = true
  }
  for (const id of evolutionItems) {
    const item = items[id]
    if (item) item.evolution = true
    else problems.push(`An evolution spends the item "${id}", which is not in the pack`)
  }
  if (!items.linkingcord) problems.push('Trade evolutions need the Linking Cord, which is not in the pack')

  // Every item of the Bag categories is either given an effect or left out for a stated reason.
  for (const row of itemRows) {
    const category = categories.get(row.category_id ?? '')?.identifier ?? ''
    const identifier = row.identifier ?? ''
    if (!BAG_CATEGORIES.includes(category)) continue
    const listed = identifier in bagTable.effects || identifier in bagTable.excluded
    if (!listed) problems.push(`The ${category} item "${identifier}" has neither an effect nor a reason to be left out`)
    if (identifier in bagTable.effects && !englishProse.has(row.id)) {
      problems.push(`"${identifier}" has an effect although PokéAPI has no English effect text for it`)
    }
  }

  // -------------------------------------------------------------------------
  // Natures, types, stat names
  // -------------------------------------------------------------------------
  const natureNames = await nameFinder('natures', 'nature_names', 'nature_id')
  const natures: Record<string, NatureData> = {}
  for (const nature of Dex.natures.all()) {
    const data: NatureData = { id: nature.id, name: natureNames.localized(nature.id, nature.name) }
    if (nature.plus && nature.minus) {
      data.plus = nature.plus
      data.minus = nature.minus
    }
    natures[nature.id] = data
  }

  const typeNames = await nameFinder('types', 'type_names', 'type_id')
  const MULTIPLIER = [1, 2, 0.5, 0]
  // Stellar is not listed as a type (kickoff prompt).
  const typeList = Dex.types.all().filter((type) => type.id !== 'stellar' && !type.isNonstandard)
  const types: Record<string, TypeData> = {}
  for (const attacker of typeList) {
    const against: Record<string, number> = {}
    for (const defender of typeList) {
      const multiplier = MULTIPLIER[defender.damageTaken[attacker.name] ?? 0] ?? 1
      if (multiplier !== 1) against[defender.id] = multiplier
    }
    types[attacker.id] = { id: attacker.id, name: typeNames.localized(attacker.id, attacker.name), against }
  }

  const statRows = indexBy(await readTable(lock, 'stats'), 'identifier')
  const statTexts = await texts.names('stat_names', 'stat_id')
  const POKEAPI_STAT: Record<StatId, string> = {
    hp: 'hp',
    atk: 'attack',
    def: 'defense',
    spa: 'special-attack',
    spd: 'special-defense',
    spe: 'speed',
  }
  const statNames = {} as Record<StatId, Localized>
  for (const stat of STATS) {
    const names = statTexts.get(statRows.get(POKEAPI_STAT[stat])?.id ?? '')
    if (!names?.en || !names.fr) problems.push(`No name for the stat ${stat}`)
    statNames[stat] = { en: names?.en ?? stat, fr: names?.fr ?? stat }
  }

  // -------------------------------------------------------------------------
  // References, then the version
  // -------------------------------------------------------------------------
  for (const entry of Object.values(species)) {
    for (const move of entry.learnset) if (!moves[move.move]) problems.push(`${entry.name.en}: unknown move ${move.move}`)
    for (const ability of entry.abilities) if (!abilities[ability]) problems.push(`${entry.name.en}: unknown Ability ${ability}`)
    for (const evolution of entry.evolutions) {
      if (!species[evolution.to]) problems.push(`${entry.name.en}: unknown evolution ${evolution.to}`)
      if (evolution.item && !items[evolution.item]) problems.push(`${entry.name.en}: unknown evolution item ${evolution.item}`)
    }
  }

  for (const sheet of ['pokemonicons-sheet.png', 'itemicons-sheet.png']) {
    if (!(sheet in sprites.showdown.files)) problems.push(`The icon sheet ${sheet} is not pinned`)
  }
  for (const type of Object.values(types)) {
    if (!(`types/${type.name.en}.png` in sprites.showdown.files)) problems.push(`No icon pinned for the type ${type.name.en}`)
  }

  const content = { species, moves, abilities, items, natures, types, statNames }
  const pack: DataPack = {
    version: `${engineVersion}+pokeapi.${lock.commit.slice(0, 7)}+${sha256(new TextEncoder().encode(stableJson(content, 0))).slice(0, 8)}`,
    sources: { engine: engineVersion, pokeapi: lock.commit },
    ...content,
  }
  return { pack, problems, notes: [...new Set(notes)], lock }
}
