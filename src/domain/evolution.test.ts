import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import type { CharacterDocument } from '../shared/schema/character'
import { checkCharacter, maxHpOf } from './character-check'
import { abilityAfterEvolving, evolutionOffers, evolved } from './evolution'
import { progressPack } from './progress-pack'
import { newcomer, testRules } from './test-pack'

const at = (level: number, changes: Partial<CharacterDocument> = {}): CharacterDocument => newcomer({ level, exp: expForLevel(level), ...changes })
const rat = (changes: Partial<CharacterDocument> = {}): CharacterDocument => at(25, { species: 'sparkrat', ...changes })
const speciesOf = (id: string) => {
  const species = progressPack.species[id]
  if (!species) throw new Error(`The test pack has no ${id}`)
  return species
}

describe('the evolutions a character is offered', () => {
  it('are those of its species into Pokémon the game data has, each with what it still lacks', () => {
    expect(evolutionOffers(at(19), progressPack)).toEqual([{ to: 'sparkrat', method: 'level', level: 20, missing: 'level' }])
    expect(evolutionOffers(at(20), progressPack)).toEqual([{ to: 'sparkrat', method: 'level', level: 20 }])
    // A stone or the cord must be in its own Bag; the form the pack lacks is not offered.
    expect(evolutionOffers(rat({ bag: [{ item: 'cord', quantity: 1 }] }), progressPack)).toEqual([
      { to: 'sparklord', method: 'item', item: 'stone', missing: 'item' },
      { to: 'sparkking', method: 'trade', item: 'cord' },
    ])
  })
})

describe('evolving', () => {
  it('changes the species, raises the HP by what its maximum gained, and keeps the rest', () => {
    const before = at(20, { hp: 12 })
    const after = evolved(before, 'sparkrat', progressPack)
    const gain = (maxHpOf({ ...before, species: 'sparkrat' }, progressPack) ?? 0) - (maxHpOf(before, progressPack) ?? 0)
    expect(gain).toBeGreaterThan(0)
    expect(after).toMatchObject({ ok: true, character: { species: 'sparkrat', hp: 12 + gain, nickname: before.nickname, level: 20, moves: before.moves, bag: before.bag, revision: before.revision + 1 } })
    // The moves it knew are still moves it may know: the sheet is still a valid one.
    expect(after.ok && checkCharacter(after.character, testRules({ species: ['sparkmouse'] }), progressPack)).toEqual([])
  })

  it('spends the stone or the cord, and nothing for a level', () => {
    const carrying = rat({ bag: [{ item: 'stone', quantity: 2 }, { item: 'cord', quantity: 1 }] })
    expect(evolved(carrying, 'sparklord', progressPack)).toMatchObject({ ok: true, character: { species: 'sparklord', bag: [{ item: 'stone', quantity: 1 }, { item: 'cord', quantity: 1 }] } })
    expect(evolved(carrying, 'sparkking', progressPack)).toMatchObject({ ok: true, character: { species: 'sparkking', bag: [{ item: 'stone', quantity: 2 }] } })
  })

  it('leaves a downed Pokémon at 0 HP, and is not for the dead', () => {
    expect(evolved(at(20, { hp: 0, condition: { state: 'downed', stacks: 1 } }), 'sparkrat', progressPack)).toMatchObject({ ok: true, character: { species: 'sparkrat', hp: 0 } })
    expect(evolved(at(20, { hp: 0, condition: { state: 'dead' } }), 'sparkrat', progressPack)).toEqual({ ok: false, problem: 'dead' })
  })

  it('says what is missing, or that the species has no such evolution', () => {
    expect(evolved(at(19), 'sparkrat', progressPack)).toEqual({ ok: false, problem: 'level' })
    expect(evolved(rat(), 'sparklord', progressPack)).toEqual({ ok: false, problem: 'item' })
    expect(evolved(at(50), 'sparklord', progressPack)).toEqual({ ok: false, problem: 'no-such-evolution' })
    expect(evolved(rat(), 'nowhere', progressPack)).toEqual({ ok: false, problem: 'no-such-evolution' })
  })
})

describe('the Ability of a Pokémon that evolves (decision 169)', () => {
  it('keeps its place: first to first, second to second, hidden to hidden', () => {
    expect(abilityAfterEvolving('zap', speciesOf('sparkmouse'), speciesOf('sparkrat'))).toBe('zap')
    expect(abilityAfterEvolving('zap', speciesOf('sparkrat'), speciesOf('sparkduke'))).toBe('calm')
    expect(abilityAfterEvolving('buzz', speciesOf('sparkrat'), speciesOf('sparkduke'))).toBe('storm')
    expect(abilityAfterEvolving('hiddenzap', speciesOf('sparkmouse'), speciesOf('sparkrat'))).toBe('hiddenbuzz')
    expect(abilityAfterEvolving('hiddenbuzz', speciesOf('sparkrat'), speciesOf('sparkking'))).toBe('hiddenking')
    expect(evolved(at(20, { ability: 'hiddenzap' }), 'sparkrat', progressPack)).toMatchObject({ ok: true, character: { ability: 'hiddenbuzz' } })
  })

  it('is the new form\'s first where it has no such place', () => {
    // A second place the new form lacks, and a hidden place it lacks.
    expect(abilityAfterEvolving('buzz', speciesOf('sparkrat'), speciesOf('sparkking'))).toBe('zap')
    expect(abilityAfterEvolving('buzz', speciesOf('sparkrat'), speciesOf('sparklord'))).toBe('lordly')
    expect(abilityAfterEvolving('hiddenbuzz', speciesOf('sparkrat'), speciesOf('sparklord'))).toBe('lordly')
    // An Ability the old form never had.
    expect(abilityAfterEvolving('borrowed', speciesOf('sparkrat'), speciesOf('sparkking'))).toBe('zap')
  })
})
