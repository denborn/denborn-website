/**
 * Tripwires on the engine's source.
 *
 * Denborn's adapter contains copies of a few engine functions with their
 * middle changed, wraps others, and mirrors the steps of some. Each depends on
 * the engine's code staying as it was when the adapter was written. This test
 * fingerprints that code: when an engine upgrade changes any of it, the test
 * fails and names what changed, so the matching part of the adapter is read
 * again before the new fingerprint is accepted.
 */
import { createHash } from 'node:crypto'
import { Battle, Dex, Pokemon, Side, toID } from '@pkmn/sim'
import { expect, it } from 'vitest'

function fingerprint(value: unknown): string {
  if (typeof value !== 'function') throw new Error('Not a function: the engine no longer has it')
  return createHash('sha256').update(Function.prototype.toString.call(value)).digest('hex').slice(0, 16)
}

const probe = new Battle({ formatid: toID('gen9customgame') })
const actions = Object.getPrototypeOf(probe.actions) as Record<string, unknown>
const queue = Object.getPrototypeOf(probe.queue) as Record<string, unknown>
const battle = Battle.prototype as unknown as Record<string, unknown>
const pokemon = Pokemon.prototype as unknown as Record<string, unknown>
const side = Side.prototype as unknown as Record<string, unknown>
const moves = Dex.data.Moves as unknown as Record<string, Record<string, unknown>>
const abilities = Dex.data.Abilities as unknown as Record<string, Record<string, unknown>>
const conditions = Dex.data.Conditions as unknown as Record<string, Record<string, unknown>>

/** What each fingerprint guards in the adapter. */
const WATCHED: Record<string, unknown> = {
  // Copied with changes in engine/lines.ts.
  'Battle.validTargetLoc': battle.validTargetLoc,
  'Battle.getTarget': battle.getTarget,
  'Battle.getRandomTarget': battle.getRandomTarget,
  'Pokemon.getMoveTargets': pokemon.getMoveTargets,
  'Pokemon.isAdjacent': pokemon.isAdjacent,
  'Pokemon.adjacentFoes': pokemon.adjacentFoes,
  'Pokemon.getAtLoc': pokemon.getAtLoc,
  'Pokemon.getLocOf': pokemon.getLocOf,
  // Replaced in engine/agony.ts; the faint pipeline and the hit steps it relies on.
  'Battle.checkWin': battle.checkWin,
  'Battle.resolveFaints': battle.resolveFaints,
  'Pokemon.faint': pokemon.faint,
  'Pokemon.clearVolatile': pokemon.clearVolatile,
  'BattleActions.trySpreadMoveHit': actions.trySpreadMoveHit,
  'BattleActions.hitStepMoveHitLoop': actions.hitStepMoveHitLoop,
  'BattleActions.useMoveInner': actions.useMoveInner,
  'BattleActions.switchIn': actions.switchIn,
  // Wrapped in engine/turn-order.ts and engine/locks.ts.
  'Battle.getActionSpeed': battle.getActionSpeed,
  'Battle.runAction': battle.runAction,
  'BattleActions.runMove': actions.runMove,
  'Pokemon.getLockedMove': pokemon.getLockedMove,
  // Mirrored in engine/positions.ts and engine/format.ts.
  'Battle.swapPosition': battle.swapPosition,
  'Pokemon.setStatus': pokemon.setStatus,
  'Battle.calculatePP': battle.calculatePP,
  'Battle.start': battle.start,
  // The choice flow denborn-battle.ts feeds, and the actions it queues by hand.
  'Side.chooseMove': side.chooseMove,
  'Side.getChoiceIndex': side.getChoiceIndex,
  'Side.choosePass': side.choosePass,
  'Side.isChoiceDone': side.isChoiceDone,
  'Battle.commitChoices': battle.commitChoices,
  'BattleQueue.resolveAction': queue.resolveAction,
  'Pokemon.getMoves': pokemon.getMoves,
  // Replaced in engine/mod.ts, or relied on as they are (decision 63).
  'Moves.allyswitch.onHit': moves.allyswitch?.onHit,
  'Moves.revivalblessing.onTryHit': moves.revivalblessing?.onTryHit,
  'Abilities.imposter.onSwitchIn': abilities.imposter?.onSwitchIn,
  'Conditions.futuremove.onEnd': conditions.futuremove?.onEnd,
}

// Fingerprints taken on @pkmn/sim 0.10.12. After an engine upgrade: read each changed function,
// adjust the adapter where it matters, then paste the new values from the test's failure output.
const EXPECTED: Record<string, string> = {
  'Abilities.imposter.onSwitchIn': '0af17553f2579ca7',
  'Battle.calculatePP': 'f32485868c333ab1',
  'Battle.checkWin': 'b678c51d7c2dc7de',
  'Battle.commitChoices': '06e925ac8da3660e',
  'Battle.getActionSpeed': '048c0f5de61c1eae',
  'Battle.getRandomTarget': 'b5e72cb71d8faf27',
  'Battle.getTarget': 'b47e6c4618afa816',
  'Battle.resolveFaints': 'f496e779c6648939',
  'Battle.runAction': 'd8e8e2fc15c55f1f',
  'Battle.start': 'ab350de0014c81d5',
  'Battle.swapPosition': '7dc17c98494038c0',
  'Battle.validTargetLoc': 'a7e94768525faac9',
  'BattleActions.hitStepMoveHitLoop': 'e3ee4480c8c1e73f',
  'BattleActions.runMove': '827be893a3fd9237',
  'BattleActions.switchIn': 'dc716bf072e26a81',
  'BattleActions.trySpreadMoveHit': '2b85b854a198b9c9',
  'BattleActions.useMoveInner': 'c5653d69f80ebdd3',
  'BattleQueue.resolveAction': '16a70b9cf47d6b75',
  'Conditions.futuremove.onEnd': '5c11653baa30afb3',
  'Moves.allyswitch.onHit': '2c4ce27f390f1124',
  'Moves.revivalblessing.onTryHit': 'a0b2f1c4609c732b',
  'Pokemon.adjacentFoes': '233f5744f4510a8b',
  'Pokemon.clearVolatile': 'a3a6367407d181ea',
  'Pokemon.faint': '969b8ed8d05f9fd9',
  'Pokemon.getAtLoc': '59417526a53c1072',
  'Pokemon.getLocOf': '331f7dbaa437b696',
  'Pokemon.getLockedMove': 'f3d326cf6270cb9d',
  'Pokemon.getMoveTargets': 'f110514c5f222d16',
  'Pokemon.getMoves': '98c25f97b2cd8876',
  'Pokemon.isAdjacent': '30724aec60d5a684',
  'Pokemon.setStatus': 'd279a28637c0ca7d',
  'Side.chooseMove': '06559096e1370f97',
  'Side.choosePass': '07e18a7e5d195c16',
  'Side.getChoiceIndex': 'bea2a4b69d8d2d44',
  'Side.isChoiceDone': 'f5e48c27a1900fe9',
}

it('the engine code the adapter depends on is the code it was written against', () => {
  const actual = Object.fromEntries(Object.entries(WATCHED).map(([name, value]) => [name, fingerprint(value)]))
  expect(actual).toEqual(EXPECTED)
})
