import { describe, expect, it } from 'vitest'
import { withPointsPlaced } from '../../domain/level-up'
import { progressPack } from '../../domain/progress-pack'
import { newcomer } from '../../domain/test-pack'
import { expForLevel } from '../../game-rules/exp'
import { tvBudget, tvOf } from '../../game-rules/training'
import type { CharacterDocument } from '../../shared/schema/character'
import { draftOfPoints, leftAfter, newPoints, placementOf, rangeOf, withPoint } from './points-draft'

const LEVEL = 30
const character: CharacterDocument = newcomer({
  level: LEVEL,
  exp: expForLevel(LEVEL),
  ivs: { hp: 5, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  attributes: { creation: { strength: 75, dexterity: 45, endurance: 45, perception: 45, charisma: 45, intelligence: 45 }, gained: { strength: 2, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 } },
})
const start = draftOfPoints(character)
/** Level 30 gives 93 TV; 5 are placed. */
const LEFT = tvBudget(LEVEL) - 5

describe('points being placed', () => {
  it('start where the sheet has them, with nothing new', () => {
    expect(start).toEqual({ ivs: character.ivs, evs: character.evs, scores: { strength: 77, dexterity: 45, endurance: 45, perception: 45, charisma: 45, intelligence: 45 } })
    expect(newPoints(character, start)).toBe(0)
    expect(leftAfter(character, start)).toEqual({ tv: LEFT, scores: LEVEL - 1 - 2 })
  })

  it('never go under what is already placed, nor over a total\'s cap or the points left', () => {
    expect(tvOf(withPoint(character, start, { kind: 'tv', stat: 'hp' }, 2)).hp).toBe(5)
    // One stat cannot take its 94: the level's TV runs out first.
    expect(tvOf(withPoint(character, start, { kind: 'tv', stat: 'hp' }, 94)).hp).toBe(5 + LEFT)
    expect(tvOf(withPoint(character, start, { kind: 'tv', stat: 'atk' }, 94)).atk).toBe(LEFT)
    // 27 roleplay points left: 77 + 27 would pass 95, so the cap stops it first; a lower attribute stops at the points left.
    expect(withPoint(character, start, { kind: 'scores', attribute: 'strength' }, 200).scores.strength).toBe(95)
    expect(withPoint(character, start, { kind: 'scores', attribute: 'charisma' }, 200).scores.charisma).toBe(45 + 27)
  })

  it('share one budget: what one total takes is no longer there for the next', () => {
    const first = withPoint(character, start, { kind: 'tv', stat: 'atk' }, 31)
    const left = LEFT - 31
    expect(leftAfter(character, first).tv).toBe(left)
    expect(rangeOf(character, first, { kind: 'tv', stat: 'def' })).toEqual({ floor: 0, cap: 94, ceiling: left })
    // The total already raised can still go back down to its floor, and up by what is left.
    expect(rangeOf(character, first, { kind: 'tv', stat: 'atk' })).toEqual({ floor: 0, cap: 94, ceiling: 31 + left })
    expect(newPoints(character, first)).toBe(31)
  })

  it('bring a stat raised and brought back down to exactly what the sheet has, however its TV is kept', () => {
    // Made before TV: 5 IVs and 42 EVs in one stat, 15 TV with two EVs short of a fourth.
    const before: CharacterDocument = { ...character, evs: { ...character.evs, hp: 42 } }
    const raised = withPoint(before, draftOfPoints(before), { kind: 'tv', stat: 'hp' }, 40)
    expect(raised).toMatchObject({ ivs: { hp: 30 }, evs: { hp: 42 } })
    const back = withPoint(before, raised, { kind: 'tv', stat: 'hp' }, 0)
    expect(back).toEqual(draftOfPoints(before))
    expect(newPoints(before, back)).toBe(0)
  })

  it('are asked as totals the rules accept: TV as IVs and EVs, the roleplay points on top of creation\'s', () => {
    const draft = withPoint(character, withPoint(character, start, { kind: 'tv', stat: 'spe' }, 40), { kind: 'scores', attribute: 'charisma' }, 50)
    expect(newPoints(character, draft)).toBe(40 + 5)
    expect(placementOf(character, draft)).toMatchObject({ ivs: { hp: 5, spe: 31 }, evs: { spe: 36 }, gained: { strength: 2, charisma: 5, dexterity: 0 } })
    expect(withPointsPlaced(character, placementOf(character, draft), progressPack)).toMatchObject({ ok: true, character: { ivs: { spe: 31 }, attributes: { gained: { charisma: 5 } } } })
  })
})
