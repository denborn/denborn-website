import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import type { CharacterDocument } from '../shared/schema/character'
import { checkCharacter, maxHpOf } from './character-check'
import { progressPack } from './progress-pack'
import { reselected, rested } from './rest'
import { newcomer, testRules } from './test-pack'

const rules = testRules()
const at = (level: number, changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ level, exp: expForLevel(level), ...changes })

describe('a rest at a Pokémon Center', () => {
  it('heals a character fully: HP, status condition, and the PP of every move with its PP Ups', () => {
    const tired = at(12, { hp: 3, status: 'psn', moves: [{ id: 'tackle', ppUps: 2, pp: 1 }, { id: 'spark', ppUps: 0, pp: 0 }, { id: 'onechance', ppUps: 0, pp: 0 }] })
    const result = rested(tired, progressPack)
    expect(result).toMatchObject({
      ok: true,
      // Tackle holds 35 PP, and 14 more with two PP Ups.
      character: { hp: maxHpOf(tired, progressPack), condition: { state: 'standing' }, moves: [{ id: 'tackle', ppUps: 2, pp: 49 }, { id: 'spark', pp: 20 }, { id: 'onechance', pp: 1 }], revision: tired.revision + 1 },
    })
    expect(result.ok && 'status' in result.character).toBe(false)
  })

  it('brings a downed character back (Agony rule 10), and does nothing for the dead (decision 173)', () => {
    const downed = at(12, { hp: 0, condition: { state: 'downed', stacks: 1 } })
    expect(rested(downed, progressPack)).toMatchObject({ ok: true, character: { hp: maxHpOf(downed, progressPack), condition: { state: 'standing' } } })
    expect(rested(at(12, { hp: 0, condition: { state: 'dead' } }), progressPack)).toEqual({ ok: false, problem: 'dead' })
  })

  it('does not change a sheet it does not touch', () => {
    const tired = at(12, { hp: 3 })
    rested(tired, progressPack)
    expect(tired.hp).toBe(3)
  })
})

describe('choosing an Ability and moves again, during a rest', () => {
  const known = at(12, { moves: [{ id: 'tackle', ppUps: 3, pp: 7 }, { id: 'spark', ppUps: 1, pp: 2 }] })

  it('takes any Ability of the species, and moves the character may know at its level', () => {
    const result = reselected(known, { ability: 'hiddenzap', moves: ['spark', 'shared', 'tackle'] }, rules, progressPack)
    expect(result).toMatchObject({ ok: true, character: { ability: 'hiddenzap', revision: known.revision + 1 } })
    // A move it keeps stays as it was; a new one comes with its full PP and no PP Up.
    expect(result.ok && result.character.moves).toEqual([{ id: 'spark', ppUps: 1, pp: 2 }, { id: 'shared', ppUps: 0, pp: 10 }, { id: 'tackle', ppUps: 3, pp: 7 }])
    expect(result.ok && checkCharacter(result.character, rules, progressPack)).toEqual([])
  })

  it('loses the PP Ups of a move it drops, even when the move is taken again later (decision 3)', () => {
    const dropped = reselected(known, { ability: 'zap', moves: ['spark'] }, rules, progressPack)
    const back = dropped.ok ? reselected(dropped.character, { ability: 'zap', moves: ['spark', 'tackle'] }, rules, progressPack) : dropped
    expect(back.ok && back.character.moves).toEqual([{ id: 'spark', ppUps: 1, pp: 2 }, { id: 'tackle', ppUps: 0, pp: 35 }])
  })

  it('follows the campaign\'s move access and the character\'s level', () => {
    // Megabolt is learned at level 40; the TM move needs the wider ruling.
    expect(reselected(known, { ability: 'zap', moves: ['megabolt'] }, rules, progressPack)).toEqual({ ok: false, problem: 'moves' })
    expect(reselected(at(40), { ability: 'zap', moves: ['megabolt'] }, rules, progressPack).ok).toBe(true)
    expect(reselected(known, { ability: 'zap', moves: ['tmwave'] }, rules, progressPack)).toEqual({ ok: false, problem: 'moves' })
    expect(reselected(known, { ability: 'zap', moves: ['tmwave'] }, testRules({ moveAccess: 'level-up-tm-tutor-egg' }), progressPack).ok).toBe(true)
  })

  it('refuses an Ability of another species, no move, a move twice, more than six, a move the game data lacks', () => {
    expect(reselected(known, { ability: 'sturdy', moves: ['tackle'] }, rules, progressPack)).toEqual({ ok: false, problem: 'ability' })
    expect(reselected(known, { ability: 'zap', moves: [] }, rules, progressPack)).toEqual({ ok: false, problem: 'moves' })
    expect(reselected(known, { ability: 'zap', moves: ['tackle', 'tackle'] }, rules, progressPack)).toEqual({ ok: false, problem: 'moves' })
    const seven = ['tackle', 'spark', 'onechance', 'shared', 'tmwave', 'eggkick', 'megabolt']
    expect(reselected(at(40), { ability: 'zap', moves: seven }, testRules({ moveAccess: 'level-up-tm-tutor-egg' }), progressPack)).toEqual({ ok: false, problem: 'moves' })
    expect(reselected(at(40), { ability: 'zap', moves: seven.slice(0, 6) }, testRules({ moveAccess: 'level-up-tm-tutor-egg' }), progressPack).ok).toBe(true)
    expect(reselected(known, { ability: 'zap', moves: ['nothing'] }, testRules({ commonMoves: ['nothing'] }), progressPack)).toEqual({ ok: false, problem: 'moves' })
  })

  it('leaves the sheet as it is when nothing was changed, and is not for the dead', () => {
    const same = reselected(known, { ability: 'zap', moves: ['tackle', 'spark'] }, rules, progressPack)
    expect(same.ok && same.character).toBe(known)
    // The same moves in another order are a change.
    expect(reselected(known, { ability: 'zap', moves: ['spark', 'tackle'] }, rules, progressPack)).toMatchObject({ ok: true, character: { revision: known.revision + 1 } })
    expect(reselected(at(12, { hp: 0, condition: { state: 'dead' } }), { ability: 'zap', moves: ['tackle'] }, rules, progressPack)).toEqual({ ok: false, problem: 'dead' })
  })
})
