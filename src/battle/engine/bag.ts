/**
 * The Bag action (DECISIONS.md 1.1 "Actions", decisions 19 to 21).
 *
 * It is queued by the adapter as a custom action at priority +1, so the engine
 * places it after +2 moves and in Speed order among +1 moves. When its turn
 * comes, this handler checks that the user can act, then applies the item
 * through the engine's own healing, curing and boosting functions.
 */
import type { Battle, Pokemon } from '@pkmn/sim'
import type { BagUse } from '../../game-rules/bag-effects'
import { revive } from './agony'
import { emit, findCombatant, isDowned, stateOf } from './state'

export type BagOutcome = 'used' | 'failed' | 'blocked'

/** Applies every part of the item's effect that the target can take. Returns whether any did. */
function apply(battle: Battle, user: Pokemon, use: BagUse): boolean {
  const { effect } = use

  if (effect.reviveAll) {
    let any = false
    for (const ally of user.side.pokemon) {
      if (!isDowned(ally)) continue
      revive(battle, ally, ally.maxhp)
      any = true
    }
    return any
  }

  const target = findCombatant(battle, use.target)
  if (!target) return false

  if (effect.revive) {
    // Revival items only work on downed Pokémon.
    if (!isDowned(target)) return false
    revive(battle, target, effect.revive === 'full' ? target.maxhp : Math.floor(target.maxhp / 2))
    return true
  }

  // Only revival items do anything for a Pokémon at 0 HP.
  if (target.fainted) return false

  const item = battle.dex.items.get(use.item)
  let applied = false

  if (effect.heal !== undefined) {
    const amount = effect.heal === 'full' ? target.maxhp : effect.heal
    if (battle.heal(amount, target, user, item)) applied = true
  }
  if (effect.cure && target.status && (effect.cure === 'all' || effect.cure.some((id) => id === target.status))) {
    if (target.cureStatus()) applied = true
  }
  if (effect.cureConfusion && target.volatiles.confusion) {
    target.removeVolatile('confusion')
    applied = true
  }
  if (effect.restorePp) {
    const { amount, scope } = effect.restorePp
    for (const slot of target.moveSlots) {
      if (scope === 'one' && slot.id !== use.move) continue
      if (slot.pp >= slot.maxpp) continue
      slot.pp = amount === 'full' ? slot.maxpp : Math.min(slot.maxpp, slot.pp + amount)
      emit(battle, 'pp', stateOf(target).id, slot.id, slot.pp)
      applied = true
    }
  }
  if (effect.boost) {
    if (battle.boost({ [effect.boost.stat]: effect.boost.stages }, target, user, item)) applied = true
  }
  if (effect.crit && !target.volatiles.focusenergy) {
    if (target.addVolatile('focusenergy', user)) applied = true
  }
  if (effect.guard) {
    if (target.side.addSideCondition('mist', user)) applied = true
  }
  return applied
}

export const bagHandlers = {
  onDenbornBag(this: Battle, pokemon: Pokemon): void {
    const state = stateOf(pokemon)
    const use = state.bag
    state.bag = null
    // A Pokémon that went down before its Bag action came has no turn (Agony rule 3).
    if (!use || pokemon.fainted) return

    const report = (outcome: BagOutcome): void => emit(this, 'bag', state.id, use.item, use.target, outcome)

    // Decision 21: whatever would stop the Pokémon's move this turn stops its Bag action.
    // Struggle carries the check because the engine already exempts it from everything that
    // only restricts which move may be chosen (Choice items, Disable, Taunt, Imprison).
    pokemon.activeMoveActions++
    const carrier = this.dex.getActiveMove('struggle')
    const target = findCombatant(this, use.target) ?? null
    this.setActiveMove(carrier, pokemon, target)
    const canAct = this.runEvent('BeforeMove', pokemon, target, carrier) as unknown
    if (!canAct) {
      this.runEvent('MoveAborted', pokemon, target, carrier)
      this.clearActiveMove(true)
      report('blocked')
      return
    }
    this.clearActiveMove()

    // A failed use still takes the turn; the item then stays in the bag.
    report(apply(this, pokemon, use) ? 'used' : 'failed')
  },
}
