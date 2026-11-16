import { describe, expect, it } from 'vitest'
import { withPointsPlaced } from '../../domain/level-up'
import { progressPack } from '../../domain/progress-pack'
import { newcomer } from '../../domain/test-pack'
import { evBudget, ivBudget } from '../../game-rules/budgets'
import { expForLevel } from '../../game-rules/exp'
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

describe('points being placed', () => {
  it('start where the sheet has them, with nothing new', () => {
    expect(start).toEqual({ ivs: character.ivs, evs: character.evs, scores: { strength: 77, dexterity: 45, endurance: 45, perception: 45, charisma: 45, intelligence: 45 } })
    expect(newPoints(character, start)).toBe(0)
    expect(leftAfter(character, start)).toEqual({ ivs: ivBudget(LEVEL) - 5, evs: evBudget(LEVEL), scores: LEVEL - 1 - 2 })
  })

  it('never go under what is already placed, nor over a stat\'s cap or the points left', () => {
    expect(withPoint(character, start, 'ivs', 'hp', 2).ivs.hp).toBe(5)
    expect(withPoint(character, start, 'ivs', 'hp', 99).ivs.hp).toBe(31)
    // 153 EV points at level 30: one stat cannot take its 252.
    expect(withPoint(character, start, 'evs', 'atk', 252).evs.atk).toBe(evBudget(LEVEL))
    // 27 roleplay points left: 77 + 27 would pass 95, so the cap stops it first; a lower attribute stops at the points left.
    expect(withPoint(character, start, 'scores', 'strength', 200).scores.strength).toBe(95)
    expect(withPoint(character, start, 'scores', 'charisma', 200).scores.charisma).toBe(45 + 27)
  })

  it('share one budget: what one total takes is no longer there for the next', () => {
    const first = withPoint(character, start, 'ivs', 'atk', 31)
    const left = ivBudget(LEVEL) - 5 - 31
    expect(leftAfter(character, first).ivs).toBe(left)
    expect(rangeOf(character, first, 'ivs', 'def')).toEqual({ floor: 0, cap: 31, ceiling: left })
    // The total already raised can still go back down to its floor, and no further up than its cap.
    expect(rangeOf(character, first, 'ivs', 'atk')).toEqual({ floor: 0, cap: 31, ceiling: 31 })
    expect(newPoints(character, first)).toBe(31)
  })

  it('are asked as totals the rules accept: the roleplay points on top of creation\'s', () => {
    const draft = withPoint(character, withPoint(character, withPoint(character, start, 'ivs', 'spe', 10), 'evs', 'spe', 40), 'scores', 'charisma', 50)
    expect(newPoints(character, draft)).toBe(10 + 40 + 5)
    expect(placementOf(character, draft)).toMatchObject({ ivs: { hp: 5, spe: 10 }, evs: { spe: 40 }, gained: { strength: 2, charisma: 5, dexterity: 0 } })
    expect(withPointsPlaced(character, placementOf(character, draft), progressPack)).toMatchObject({ ok: true, character: { ivs: { spe: 10 }, attributes: { gained: { charisma: 5 } } } })
  })
})
