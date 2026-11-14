import { describe, expect, it } from 'vitest'
import { testPack, testRules } from '../../domain/test-pack'
import { type CreationDraft, choose, emptyDraft, identityProblems, speciesProblem } from './draft'

const pick = (draft: CreationDraft, species: string): CreationDraft => choose(draft, { choose: 'species', species }, testPack)

describe('choosing a species', () => {
  it('fills in the gender and the Ability when the species has only one', () => {
    expect(pick(emptyDraft, 'stonegolem')).toEqual({ nickname: '', species: 'stonegolem', gender: 'N', ability: 'sturdy' })
  })

  it('leaves them to choose when the species has several', () => {
    expect(pick(emptyDraft, 'sparkmouse')).toEqual({ nickname: '', species: 'sparkmouse' })
  })

  it('keeps the name, and what still fits the new species', () => {
    const mouse: CreationDraft = { nickname: 'Volt', species: 'sparkmouse', gender: 'F', ability: 'zap', nature: 'bold' }
    // A genderless species with another Ability: both are replaced; the nature has nothing to do with the species.
    expect(pick(mouse, 'stonegolem')).toEqual({ nickname: 'Volt', species: 'stonegolem', gender: 'N', ability: 'sturdy', nature: 'bold' })
    // Back again: its one gender and one Ability do not fit a species that has a choice.
    expect(pick(pick(mouse, 'stonegolem'), 'sparkmouse')).toEqual({ nickname: 'Volt', species: 'sparkmouse', nature: 'bold' })
  })

  it('ignores a species the data does not have', () => {
    expect(pick(emptyDraft, 'nosuchmon')).toEqual(emptyDraft)
  })

  it('must be one the campaign offers', () => {
    const rules = testRules({ species: ['sparkmouse'] })
    expect(speciesProblem(emptyDraft, rules)).toBe('none-chosen')
    expect(speciesProblem(pick(emptyDraft, 'stonegolem'), rules)).toBe('not-playable')
    expect(speciesProblem(pick(emptyDraft, 'sparkmouse'), rules)).toBeUndefined()
  })
})

describe('the identity step', () => {
  const done: CreationDraft = { nickname: 'Volt', species: 'sparkmouse', gender: 'F', ability: 'zap', nature: 'bold' }

  it('is done when a name, a gender, a nature and an Ability are chosen', () => {
    expect(identityProblems(done, testRules(), testPack)).toEqual({})
  })

  it('says what is still missing', () => {
    expect(identityProblems(pick(emptyDraft, 'sparkmouse'), testRules(), testPack)).toEqual({ nickname: 'empty', gender: true, nature: true, ability: true })
  })

  it('checks the name as it is typed, tidied', () => {
    expect(identityProblems({ ...done, nickname: '  Volt  ' }, testRules(), testPack)).toEqual({})
    expect(identityProblems({ ...done, nickname: 'Volt!' }, testRules(), testPack)).toEqual({ nickname: 'characters' })
    expect(identityProblems({ ...done, nickname: 'x'.repeat(25) }, testRules(), testPack)).toEqual({ nickname: 'too-long' })
  })

  it('asks for no nature where every Pokémon is neutral', () => {
    const withoutNature: CreationDraft = { nickname: 'Volt', species: 'sparkmouse', gender: 'F', ability: 'zap' }
    expect(identityProblems(withoutNature, testRules({ natures: 'neutral' }), testPack)).toEqual({})
    expect(identityProblems(withoutNature, testRules(), testPack)).toEqual({ nature: true })
  })

  it('refuses an Ability or a gender the species cannot have', () => {
    expect(identityProblems({ ...done, ability: 'sturdy', gender: 'N' }, testRules(), testPack)).toEqual({ gender: true, ability: true })
  })
})
