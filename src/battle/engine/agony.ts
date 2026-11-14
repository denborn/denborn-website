/**
 * Agony (DECISIONS.md 1.1 "Agony", rules 1 to 10, and decisions 44 to 64).
 *
 * The engine's own faint pipeline is the downing: it clears stat changes and
 * battle effects, ends the Ability and item, and fires every faint-triggered
 * effect, exactly "as if it had fainted". On top of that, a Pokémon with Agony
 * is marked downed instead of gone, keeps three stacks, and stays hittable.
 */
import type { ActiveMove, Battle, Pokemon } from '@pkmn/sim'
import { emit, isDowned, stateOf } from './state'

export const STARTING_STACKS = 3

/** The engine's action handlers object, as far as this file needs it. */
interface Actions {
  battle: Battle
  hitStepMoveHitLoop(targets: Pokemon[], pokemon: Pokemon, move: ActiveMove): (number | boolean | undefined | '')[]
}

function die(battle: Battle, pokemon: Pokemon): void {
  const state = stateOf(pokemon)
  state.downed = false
  state.dead = true
  state.stacks = 0
  emit(battle, 'died', state.id)
}

/** Rule 4: a damaging move that hits a downed Pokémon removes one stack, at most once per round. */
function registerHit(battle: Battle, target: Pokemon): void {
  const state = stateOf(target)
  if (!state.downed) return
  if (state.hitRound === battle.turn) {
    emit(battle, 'agonyhit', state.id, state.stacks, 'capped')
    return
  }
  state.hitRound = battle.turn
  state.stacks -= 1
  emit(battle, 'agonyhit', state.id, state.stacks)
  if (state.stacks <= 0) die(battle, target)
}

export const agonyHandlers = {
  /**
   * Runs inside the engine's faint pipeline, for every Pokémon that reaches 0 HP.
   * Rule 1: downed with three stacks. Rule 2: its status goes too (the engine
   * itself clears everything else right after this handler).
   */
  onFaint(this: Battle, pokemon: Pokemon): void {
    const state = stateOf(pokemon)
    pokemon.status = ''
    pokemon.statusState = this.initEffectState({})
    if (!state.agony) {
      state.dead = true
      emit(this, 'fainted', state.id)
      return
    }
    state.downed = true
    state.stacks = STARTING_STACKS
    state.downedRound = this.turn
    state.hitRound = 0
    // The engine is about to end the Ability and the item. Keep their state as it is now,
    // so that revival can pick up exactly where they were (rule 7).
    state.resume = {
      ability: pokemon.ability,
      abilityState: { ...pokemon.abilityState },
      item: pokemon.item,
      itemState: { ...pokemon.itemState },
    }
    emit(this, 'downed', state.id, state.stacks)
  },

  /** Rule 3: from the round after it went down, the downed Pokémon's turn costs it a stack. */
  onDenbornAgony(this: Battle, pokemon: Pokemon): void {
    const state = stateOf(pokemon)
    if (!state.downed || state.downedRound >= this.turn) return
    state.stacks -= 1
    emit(this, 'agonizing', state.id, state.stacks)
    if (state.stacks <= 0) die(this, pokemon)
  },
}

export const agonyActionOverrides = {
  /**
   * Wraps the engine's last hit step. Targets that reach it have passed the
   * engine's own guard (Wide Guard, Quick Guard), type-immunity and accuracy
   * steps, which is what "hit" means in rule 4 and decision 53.
   *
   * Downed targets are taken out before the engine deals damage: they lose a
   * stack and nothing else happens. Standing targets go through the engine
   * unchanged.
   */
  hitStepMoveHitLoop(this: Actions, targets: Pokemon[], pokemon: Pokemon, move: ActiveMove) {
    // The engine's own step lives on the prototype; this override sits on the instance.
    const engine = Object.getPrototypeOf(this) as Actions
    // Decided before any damage is dealt: a target this very move downs is not "a downed target".
    const downed = new Set(targets.filter(isDowned))
    if (!downed.size) return engine.hitStepMoveHitLoop.call(this, targets, pokemon, move)

    const standing = targets.filter((target) => !downed.has(target))
    const results = standing.length ? engine.hitStepMoveHitLoop.call(this, standing, pokemon, move) : []

    if (move.category !== 'Status') {
      for (const target of downed) registerHit(this.battle, target)
    }
    if (!standing.length) {
      // Decision 60: nothing else happens to the user. Without this, the engine treats
      // the move as failed and a crash move (High Jump Kick) would hurt its user.
      ;(move as { onMoveFail?: unknown }).onMoveFail = undefined
    }

    // NOT_FAIL: the downed target takes no further part, and the move neither succeeded nor failed on it.
    let next = 0
    return targets.map((target) => (downed.has(target) ? this.battle.NOT_FAIL : results[next++]))
  },
}

export const agonyBattleOverrides = {
  /** Rule 9: a side loses when all its Pokémon are downed or dead; both at once is a tie. */
  checkWin(this: Battle): true | undefined {
    const [players, enemies] = this.sides
    if (!players.pokemonLeft && !enemies.pokemonLeft) {
      this.tie()
      return true
    }
    if (!enemies.pokemonLeft) {
      this.win(players)
      return true
    }
    if (!players.pokemonLeft) {
      this.win(enemies)
      return true
    }
    return undefined
  },
}

/**
 * Rules 5 to 7: brings a downed Pokémon back with `hp` HP. Its Ability and item
 * simply work again; nothing that triggers on entering the field runs, because
 * it never left. Its queued action for this round is dropped (rule 6).
 *
 * The steps mirror what the engine's own Revival Blessing does, minus the
 * switch-in that would re-trigger entry Abilities.
 */
export function revive(battle: Battle, pokemon: Pokemon, hp: number): void {
  const state = stateOf(pokemon)
  if (!state.downed) throw new Error(`${state.id} is not downed`)

  state.downed = false
  state.stacks = 0
  state.hitRound = 0

  pokemon.fainted = false
  pokemon.faintQueued = false
  pokemon.subFainted = false
  pokemon.status = ''
  pokemon.statusState = battle.initEffectState({})
  pokemon.hp = Math.max(1, Math.min(Math.floor(hp), pokemon.maxhp))
  pokemon.isActive = true
  pokemon.isStarted = true
  pokemon.side.pokemonLeft++
  // The engine ended the Ability and the item when the Pokémon went down. They pick up with the
  // state they had then, without starting again: an Ability that was switched on stays on, and one
  // that triggers on entry does not trigger. An Ability the Pokémon no longer has (one it had
  // copied) is not brought back.
  const resume = state.resume
  state.resume = null
  pokemon.abilityState =
    resume?.ability === pokemon.ability
      ? resume.abilityState
      : battle.initEffectState({ id: pokemon.ability, target: pokemon })
  pokemon.itemState =
    resume?.item === pokemon.item ? resume.itemState : battle.initEffectState({ id: pokemon.item, target: pokemon })
  battle.queue.cancelAction(pokemon)
  pokemon.updateSpeed()

  battle.add('-heal', pokemon, pokemon.getHealth, '[silent]')
  emit(battle, 'revived', state.id, pokemon.hp)
}
