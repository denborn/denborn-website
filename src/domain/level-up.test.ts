import { describe, expect, it } from 'vitest'
import { CREATION_POINTS, placeScores } from '../game-rules/attributes'
import { expForLevel } from '../game-rules/exp'
import { tvBudget } from '../game-rules/training'
import type { CharacterDocument } from '../shared/schema/character'
import { maxHpOf } from './character-check'
import { type Placement, pointsLeft, withPointsPlaced } from './level-up'
import { progressPack } from './progress-pack'
import { newcomer } from './test-pack'

const LEVEL = 30
/** A character that reached level 30 with none of its points placed. */
const levelled = (changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ level: LEVEL, exp: expForLevel(LEVEL), ...changes })
const placementOf = (character: CharacterDocument, changes: Partial<Placement> = {}): Placement => ({ ivs: character.ivs, evs: character.evs, creation: character.attributes.creation, gained: character.attributes.gained, ...changes })
const place = (character: CharacterDocument, changes: Partial<Placement>) => withPointsPlaced(character, placementOf(character, changes), progressPack)

describe('the points a level brings', () => {
  it('are what the level gives, less what is placed', () => {
    const character = levelled({ ivs: { hp: 5, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } })
    expect(pointsLeft(character)).toEqual({ tv: tvBudget(LEVEL) - 5, attributes: LEVEL - 1 })
  })

  it('are placed where the player says, and may wait', () => {
    const character = levelled()
    const placed = place(character, { evs: { ...character.evs, atk: 40, spe: 12 }, gained: { ...character.attributes.gained, charisma: 7 } })
    expect(placed).toMatchObject({ ok: true, character: { evs: { atk: 40, spe: 12 }, attributes: { gained: { charisma: 7 } }, revision: character.revision + 1 } })
    // 40 EVs are 10 TV, 12 are 3.
    expect(placed.ok && pointsLeft(placed.character)).toEqual({ tv: tvBudget(LEVEL) - 13, attributes: LEVEL - 8 })
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
    // Level 30 gives 93 TV.
    expect(place(character, { ivs: { ...character.ivs, hp: 31, atk: 31, def: 31 } }).ok).toBe(true)
    expect(place(character, { ivs: { ...character.ivs, hp: 31, atk: 31, def: 31, spa: 1 } })).toEqual({ ok: false, problem: 'training' })
    expect(place(character, { ivs: { ...character.ivs, hp: 32 } })).toEqual({ ok: false, problem: 'training' })
    expect(place(character, { evs: { ...character.evs, hp: 253 } })).toEqual({ ok: false, problem: 'training' })
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

describe('roleplay points kept at creation (decision 307)', () => {
  const thirty = { strength: 30, dexterity: 30, endurance: 30, perception: 30, charisma: 30, intelligence: 30 }
  const none = { strength: 0, dexterity: 0, endurance: 0, perception: 0, charisma: 0, intelligence: 0 }
  /** At level 30, with 180 of the 265 of creation placed: 85 kept, and the level's 29. */
  const keeper = levelled({ attributes: { creation: thirty, gained: none } })

  it('are counted with the points a level brings', () => {
    expect(pointsLeft(keeper).attributes).toBe(CREATION_POINTS - 180 + LEVEL - 1)
  })

  it('are placed in creation’s layer, up to 75, before the level’s', () => {
    const placed = placeScores(keeper.attributes, { ...thirty, strength: 80 })
    const result = place(keeper, placed)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.character.attributes).toEqual({ creation: { ...thirty, strength: 75 }, gained: { ...none, strength: 5 } })
  })

  it('may not grow creation’s layer by more than were kept', () => {
    const made = levelled({ attributes: { creation: { ...thirty, strength: 75, dexterity: 75, endurance: 55 }, gained: none } })
    // 265 placed already: nothing of creation is left, so creation's layer cannot grow.
    expect(place(made, { creation: { ...made.attributes.creation, perception: 31 } })).toEqual({ ok: false, problem: 'attributes' })
  })
})

