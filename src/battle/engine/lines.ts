/**
 * Targeting on Denborn's lines.
 *
 * The stock engine has one line size for both sides, numbers the two sides in
 * mirror image, and drops any Pokémon at 0 HP when it picks targets. These
 * overrides replace that with Denborn's geometry (src/game-rules/reach.ts) and
 * keep downed Pokémon hittable (Agony rule 4).
 *
 * Several functions below are the engine's own code with the middle changed.
 * `tripwires.test.ts` fails when the engine's version of any of them changes,
 * so an upgrade cannot silently drift away from these copies.
 */
import { Battle, Pokemon } from '@pkmn/sim'
import type { ActiveMove, Move } from '@pkmn/sim'
import { type ReachKind, canReach, isAdjacent } from '../../game-rules/reach'
import { isDowned, isGone, spotOf, stateOf } from './state'

type MoveTargets = ReturnType<Pokemon['getMoveTargets']>

const NO_TARGETS: MoveTargets = { targets: [], pressureTargets: [] }

/** Kinds of move for which a player or the GM picks the target. */
const CHOSEN_TARGET_KINDS: ReadonlySet<string> = new Set([
  'normal',
  'any',
  'adjacentFoe',
  'adjacentAlly',
  'adjacentAllyOrSelf',
])

/** The Pokémon at a relative location, or nothing when the location is past the end of the line. */
function atLocation(pokemon: Pokemon, targetLoc: number): Pokemon | undefined {
  const found: Pokemon | undefined = pokemon.getAtLoc(targetLoc)
  return found
}

/** Every Pokémon on `line`, downed ones included, that a move of this kind used by `user` reaches. */
function reached(user: Pokemon, line: readonly Pokemon[], kind: ReachKind): Pokemon[] {
  const from = spotOf(user)
  return line.filter((other) => other !== user && !isGone(other) && canReach(kind, from, spotOf(other)))
}

/**
 * Foes a move used by `user` could be sent at, standing ones and downed ones apart.
 *
 * Reach is a matter of slots only: it does not depend on the user's own state.
 * The engine asks this for queued actions of Pokémon that have since gone down
 * too, and draws a random number when it finds a target; answering as it does
 * keeps the random numbers of a two-against-two battle identical to Doubles.
 */
function foesInReach(user: Pokemon, reachLimited: boolean): { standing: Pokemon[]; downed: Pokemon[] } {
  // An "any" move reaches every foe; everything else only adjacent ones.
  const inReach = reached(user, user.side.foe.active, reachLimited ? 'adjacentFoe' : 'any')
  return { standing: inReach.filter((foe) => foe.hp > 0), downed: inReach.filter(isDowned) }
}

export const pokemonOverrides = {
  /** Used by Abilities and effects (Intimidate, Trace, Healer…): standing Pokémon only. */
  isAdjacent(this: Pokemon, other: Pokemon): boolean {
    if (this.fainted || other.fainted) return false
    return isAdjacent(spotOf(this), spotOf(other))
  },

  adjacentFoes(this: Pokemon): Pokemon[] {
    return this.side.foes().filter((foe) => this.isAdjacent(foe))
  },

  getAtLoc(this: Pokemon, targetLoc: number): Pokemon | undefined {
    const side = targetLoc < 0 ? this.side : this.side.foe
    return side.active[Math.abs(targetLoc) - 1]
  },

  /** Engine: Pokemon.getMoveTargets. Changed: spread moves and chosen targets keep downed Pokémon. */
  getMoveTargets(this: Pokemon, move: ActiveMove, target: Pokemon): MoveTargets {
    const battle = this.battle
    let targets: Pokemon[] = []
    switch (move.target) {
      case 'allAdjacent':
      case 'allAdjacentFoes': {
        if (move.target === 'allAdjacent') targets.push(...reached(this, this.side.active, 'allAdjacent'))
        targets.push(...reached(this, this.side.foe.active, 'allAdjacentFoes'))
        const last = targets.at(-1)
        if (last && !targets.includes(target)) battle.retargetLastMove(last)
        break
      }
      case 'all':
      case 'foeSide':
      case 'allySide':
      case 'allyTeam':
      case 'allies':
        return Pokemon.prototype.getMoveTargets.call(this, move, target)
      default: {
        const selectedTarget = target as Pokemon | null | undefined
        let current = selectedTarget
        if (!current || (isGone(current) && !current.isAlly(this))) {
          const possibleTarget = battle.getRandomTarget(this, move)
          if (!possibleTarget) return NO_TARGETS
          current = possibleTarget
        }
        if (!move.tracksTarget) {
          current = battle.priorityEvent('RedirectTarget', this, this, move, current) as Pokemon
        }
        if (move.smartTarget) {
          targets = this.getSmartTargets(current, move)
          current = targets[0] ?? current
        } else {
          targets.push(current)
        }
        if (isGone(current) && !move.flags.futuremove) return NO_TARGETS
        if (selectedTarget !== current) battle.retargetLastMove(current)
      }
    }
    // A downed Pokémon's Ability is off, so listing it here costs no extra PP.
    const pressureTargets = move.flags.mustpressure ? this.foes() : targets
    return { targets, pressureTargets }
  },
}

export const battleTargetingOverrides = {
  /** Engine: Battle.validTargetLoc. Changed: Denborn's geometry, any line length. */
  validTargetLoc(this: Battle, targetLoc: number, source: Pokemon, targetType: string): boolean {
    if (targetLoc === 0) return true
    const target = atLocation(source, targetLoc)
    if (!target) return false
    const isSelf = target === source
    const isFoe = target.side !== source.side
    const adjacent = isAdjacent(spotOf(source), spotOf(target))
    switch (targetType) {
      case 'randomNormal':
      case 'scripted':
      case 'normal':
        return adjacent
      case 'adjacentAlly':
        return adjacent && !isFoe
      case 'adjacentAllyOrSelf':
        return (adjacent && !isFoe) || isSelf
      case 'adjacentFoe':
        return adjacent && isFoe
      case 'any':
        return !isSelf
    }
    return false
  },

  /**
   * Engine: Battle.getTarget. Changed: reach is checked again when the move is
   * used and an out-of-reach target makes the move fail (decision 66), and a
   * downed target is handled by the owner's rulings instead of being dropped.
   *
   * Locations stored by the engine are rewritten whenever two Pokémon trade
   * places (positions.ts), so a location always points at the Pokémon the
   * action was locked on.
   */
  getTarget(
    this: Battle,
    pokemon: Pokemon,
    moveOrName: string | Move,
    targetLoc: number,
    originalTarget?: Pokemon,
  ): Pokemon | null {
    const move = this.dex.moves.get(moveOrName)

    let tracksTarget = move.tracksTarget
    if (pokemon.hasAbility(['stalwart', 'propellertail'])) tracksTarget = true
    if (tracksTarget && originalTarget?.isActive) return originalTarget

    if (move.smartTarget) {
      const current = atLocation(pokemon, targetLoc)
      return current && !current.fainted ? current : this.getRandomTarget(pokemon, move)
    }

    const selfLoc = pokemon.getLocOf(pokemon)
    if (
      ['adjacentAlly', 'any', 'normal'].includes(move.target) &&
      targetLoc === selfLoc &&
      !pokemon.volatiles.twoturnmove &&
      !pokemon.volatiles.iceball &&
      !pokemon.volatiles.rollout
    ) {
      return move.flags.futuremove ? pokemon : null
    }

    if (!CHOSEN_TARGET_KINDS.has(move.target)) {
      // No target was chosen for this kind of move. "scripted" moves (Counter, Mirror Coat)
      // keep the engine's rule: the Pokémon at the queued location if it stands.
      if (move.target === 'scripted' && this.validTargetLoc(targetLoc, pokemon, move.target)) {
        const atLoc = atLocation(pokemon, targetLoc)
        if (atLoc && !atLoc.fainted) return atLoc
      }
      return this.getRandomTarget(pokemon, move)
    }

    const target = atLocation(pokemon, targetLoc)
    if (!target || !targetLoc) return this.getRandomTarget(pokemon, move)

    // The engine picks a new target at random here. Decision 66: when the target of a
    // locked action has moved out of reach, the move is used and fails.
    if (!this.validTarget(target, pokemon, move.target)) return null

    if (target.isAlly(pokemon)) {
      // Engine behaviour for a fainted ally: no retargeting.
      if (target.fainted && move.target === 'adjacentAllyOrSelf') return pokemon
      return target
    }
    if (!target.fainted) return target

    const { standing } = foesInReach(pokemon, move.target !== 'any')
    if (isDowned(target)) {
      // Decision 57: aimed on purpose at a foe that was already downed when the round began.
      if (stateOf(target).downedRound < this.turn) return target
      // Decision 45: it went down earlier this round; go to a standing foe in reach if there is one.
      return standing.length ? this.sample(standing) : target
    }

    // Dead, or fainted as in the games: a random standing foe in reach, or the move fails.
    return standing.length ? this.sample(standing) : null
  },

  /**
   * Engine: Battle.getRandomTarget. Changed: only foes in reach, a standing one
   * first and a downed one only when no foe stands in reach (decision 46).
   */
  getRandomTarget(this: Battle, pokemon: Pokemon, moveOrName: string | Move): Pokemon | null {
    const move = this.dex.moves.get(moveOrName)
    if (['self', 'all', 'allySide', 'allyTeam', 'adjacentAllyOrSelf'].includes(move.target)) {
      return pokemon
    }
    if (move.target === 'adjacentAlly') {
      const adjacentAllies = pokemon.adjacentAllies()
      return adjacentAllies.length ? this.sample(adjacentAllies) : null
    }

    const reachLimited = ['adjacentFoe', 'normal', 'randomNormal'].includes(move.target)
    const { standing, downed } = foesInReach(pokemon, reachLimited)
    if (standing.length) return this.sample(standing)

    if (reachLimited || move.target === 'any') return downed.length ? this.sample(downed) : null
    // Spread and side moves only need some foe to point at; their real targets are worked out separately.
    return pokemon.side.foe.active[0] ?? null
  },
}
