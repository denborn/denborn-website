import { describe, expect, it } from 'vitest'
import { evBudget, ivBudget } from '../game-rules/budgets'
import { expForLevel } from '../game-rules/exp'
import type { CharacterDocument } from '../shared/schema/character'
import { maxHpOf } from './character-check'
import { type Placement, pointsLeft, withPointsPlaced } from './level-up'
import { progressPack } from './progress-pack'
import { newcomer } from './test-pack'

const LEVEL = 30
/** A character that reached level 30 with none of its points placed. */
const levelled = (changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ level: LEVEL, exp: expForLevel(LEVEL), ...changes })
const placementOf = (character: CharacterDocument, changes: Partial<Placement> = {}): Placement => ({ ivs: character.ivs, evs: character.evs, gained: character.attributes.gained, ...changes })
const place = (character: CharacterDocument, changes: Partial<Placement>) => withPointsPlaced(character, placementOf(character, changes), progressPack)

describe('the points a level brings', () => {
  it('are what the level gives, less what is placed', () => {
    const character = levelled({ ivs: { hp: 5, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } })
    expect(pointsLeft(character)).toEqual({ ivs: ivBudget(LEVEL) - 5, evs: evBudget(LEVEL), attributes: LEVEL - 1 })
  })

  it('are placed where the player says, and may wait', () => {
    const character = levelled()
    const placed = place(character, { evs: { ...character.evs, atk: 40, spe: 12 }, gained: { ...character.attributes.gained, charisma: 7 } })
    expect(placed).toMatchObject({ ok: true, character: { evs: { atk: 40, spe: 12 }, attributes: { gained: { charisma: 7 } }, revision: character.revision + 1 } })
    expect(placed.ok && pointsLeft(placed.character)).toEqual({ ivs: ivBudget(LEVEL), evs: evBudget(LEVEL) - 52, attributes: LEVEL - 8 })
  })

  it('raise the HP by what its maximum gained, and leave a Pokémon at 0 HP there', () => {
    const hurt = levelled({ hp: 10 })
    const placed = place(hurt, { ivs: { ...hurt.ivs, hp: 31 }, evs: { ...hurt.evs, hp: 100 } })
    const gain = placed.ok ? (maxHpOf(placed.character, progressPack) ?? 0) - (maxHpOf(hurt, progressPack) ?? 0) : 0
    expect(gain).toBeGreaterThan(0)
    expect(placed.ok && placed.character.hp).toBe(10 + gain)

    const downed = levelled({ hp: 0, condition: { state: 'downed', stacks: 2 } })
    expect(place(downed, { ivs: { ...downed.ivs, hp: 31 } })).toMatchObject({ ok: true, character: { hp: 0, condition: { state: 'downed', stacks: 2 } } })
  })

  it('are never taken back once placed (decision 8)', () => {
    const character = levelled({ ivs: { hp: 5, atk: 5, def: 0, spa: 0, spd: 0, spe: 0 }, attributes: { ...levelled().attributes, gained: { strength: 3, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 } } })
    // Moving a point from one place to another takes it back from the first.
    expect(place(character, { ivs: { ...character.ivs, hp: 4, atk: 6 } })).toEqual({ ok: false, problem: 'taken-back' })
    expect(place(character, { evs: { ...character.evs, hp: -1 } })).toEqual({ ok: false, problem: 'taken-back' })
    expect(place(character, { gained: { ...character.attributes.gained, strength: 2, charisma: 1 } })).toEqual({ ok: false, problem: 'taken-back' })
  })

  it('stay within what the level gives and what a stat or an attribute takes', () => {
    const character = levelled()
    expect(place(character, { ivs: { ...character.ivs, hp: 31, atk: 31 } })).toEqual({ ok: false, problem: 'ivs' })
    expect(place(character, { ivs: { ...character.ivs, hp: 32 } })).toEqual({ ok: false, problem: 'ivs' })
    expect(place(character, { evs: { ...character.evs, hp: evBudget(LEVEL) + 1 } })).toEqual({ ok: false, problem: 'evs' })
    expect(place(character, { gained: { ...character.attributes.gained, strength: LEVEL } })).toEqual({ ok: false, problem: 'attributes' })
    // An attribute stops at 95, creation's points included.
    const high = levelled({ level: 60, exp: expForLevel(60), attributes: { creation: { strength: 75, dexterity: 75, endurance: 75, perception: 65, charisma: 5, intelligence: 5 }, gained: levelled().attributes.gained } })
    expect(place(high, { gained: { ...high.attributes.gained, strength: 21 } })).toEqual({ ok: false, problem: 'attributes' })
    expect(place(high, { gained: { ...high.attributes.gained, strength: 20 } }).ok).toBe(true)
  })

  it('are not placed by the dead, and placing nothing is refused', () => {
    const dead = levelled({ hp: 0, condition: { state: 'dead' } })
    expect(place(dead, { ivs: { ...dead.ivs, hp: 1 } })).toEqual({ ok: false, problem: 'dead' })
    expect(place(levelled(), {})).toEqual({ ok: false, problem: 'nothing' })
  })
})
