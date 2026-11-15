/**
 * The Pokémon of a fight as the battle screens draw them: what the fight says
 * of each (its place, its HP, what it carries), put together with its sheet
 * (its name, level and build) from the party or from the encounter.
 */
import type { DataPack, SpeciesData } from '../../data/types'
import { type LineSide, type Spot, isAdjacent } from '../../game-rules/reach'
import { type NatureEffect, type StatSpread, computeStats } from '../../game-rules/stats'
import type { PlayerFight } from '../../shared/protocol/battle'
import type { CharacterDocument } from '../../shared/schema/character'
import type { FieldState } from '../../ui'

/** The letters of the places on a line, from the left. */
const LETTERS = 'ABCDEF'

type Combatant = PlayerFight['combatants'][number]

/** What a Pokémon was built with: enough to work out its stats. */
interface Build {
  species: string
  level: number
  gender: 'M' | 'F' | 'N'
  nature?: string | undefined
  ivs: StatSpread
  evs: StatSpread
}

export interface Fighter {
  id: string
  side: LineSide
  /** Its place on its line, from the left, and that place's letter. */
  position: number
  letter: string
  /** The name it goes by: its nickname, or its species' name. */
  name: string
  /** The species it looks like right now: its own, or another's while transformed. */
  species: SpeciesData | undefined
  gender: 'M' | 'F' | 'N'
  level: number
  /** Standing, downed, or gone: dead, or fainted for good. Its slot stays on the line. */
  state: FieldState
  /** Its stats before any stage, as its sheet gives them; nothing when its species is not in the game data. */
  stats: StatSpread | undefined
  /** True when it carries stat changes. */
  changed: boolean
  /** What the fight says of it. */
  now: Combatant
}

function natureOf(pack: DataPack, id: string | undefined): NatureEffect {
  const nature = id ? pack.natures[id] : undefined
  return nature ? { ...(nature.plus ? { plus: nature.plus } : {}), ...(nature.minus ? { minus: nature.minus } : {}) } : {}
}

/** Everyone on the field, the party's line first, each line from the left. */
export function fightersOf(fight: PlayerFight, party: readonly CharacterDocument[], pack: DataPack, language: 'en' | 'fr'): Fighter[] {
  const fighters = fight.combatants.map((now): Fighter => {
    const character = party.find((member) => member.id === now.id)
    const enemy = fight.enemies.find((sheet) => sheet.id === now.id)
    const build: Build | undefined = character ?? enemy
    const own = build ? pack.species[build.species] : undefined
    const shown = pack.species[now.species] ?? own
    return {
      id: now.id,
      side: now.side,
      position: now.position,
      letter: LETTERS.charAt(now.position),
      name: character?.nickname ?? enemy?.nickname ?? own?.name[language] ?? now.species,
      species: shown,
      gender: build?.gender ?? 'N',
      level: build?.level ?? 1,
      state: now.dead ? 'gone' : now.downed ? 'downed' : 'standing',
      stats: build && own ? computeStats({ baseStats: own.baseStats, ivs: build.ivs, evs: build.evs, level: build.level, nature: natureOf(pack, build.nature) }) : undefined,
      changed: Object.keys(now.boosts).length > 0,
      now,
    }
  })
  const rank = (fighter: Fighter): number => (fighter.side === 'players' ? 0 : LETTERS.length) + fighter.position
  return fighters.sort((a, b) => rank(a) - rank(b))
}

/** Whether a one-target move of `from` reaches `to`, by the rules' own geometry: allies beside it, foes facing it. */
export function reaches(from: Fighter, to: Fighter, fighters: readonly Fighter[]): boolean {
  const spot = (fighter: Fighter): Spot => ({ side: fighter.side, position: fighter.position, lineLength: fighters.filter((other) => other.side === fighter.side).length })
  return isAdjacent(spot(from), spot(to))
}

/** Minutes and seconds left on the timer, as a clock shows them. */
export function clockText(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
