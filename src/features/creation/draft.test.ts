import { describe, expect, it } from 'vitest'
import { maxHpOf } from '../../domain/character-check'
import { attributeScores, unplacedPoints } from '../../game-rules/attributes'
import { testPack, testRules } from '../../domain/test-pack'
import type { Invitation } from '../../shared/codec/codes'
import type { CampaignRules } from '../../shared/schema/rules'
import {
  type CreationDraft,
  type DraftChoice,
  STEPS,
  attributeCeiling,
  choose,
  creationProblems,
  emptyDraft,
  identityProblems,
  isStepDone,
  movesOffered,
  speciesProblem,
  toCharacter,
} from './draft'

const context = (rules: CampaignRules = testRules()) => ({ pack: testPack, rules })
/** Applies choices in order, under the test rules or others. */
const after = (choices: DraftChoice[], rules?: CampaignRules, from: CreationDraft = emptyDraft): CreationDraft =>
  choices.reduce((draft, choice) => choose(draft, choice, context(rules)), from)
const pick = (species: string, from: CreationDraft = emptyDraft): CreationDraft => after([{ choose: 'species', species }], undefined, from)

describe('choosing a species', () => {
  it('fills in the gender and the Ability when the species has only one', () => {
    expect(pick('stonegolem')).toMatchObject({ species: 'stonegolem', gender: 'N', ability: 'sturdy' })
  })

  it('leaves them to choose when the species has several', () => {
    const draft = pick('sparkmouse')
    expect(draft.gender).toBeUndefined()
    expect(draft.ability).toBeUndefined()
  })

  it('keeps the name and the points, drops what no longer fits, and starts the moves over', () => {
    const mouse = after([
      { choose: 'species', species: 'sparkmouse' },
      { choose: 'nickname', nickname: 'Volt' },
      { choose: 'gender', gender: 'F' },
      { choose: 'ability', ability: 'zap' },
      { choose: 'nature', nature: 'bold' },
      { choose: 'iv', stat: 'spe', value: 5 },
      { choose: 'move', move: 'tackle' },
    ])
    const golem = pick('stonegolem', mouse)
    expect(golem).toMatchObject({ nickname: 'Volt', species: 'stonegolem', gender: 'N', ability: 'sturdy', nature: 'bold', moves: [] })
    expect(golem.ivs.spe).toBe(5)
    // Back again: one gender and one Ability do not fit a species that has a choice.
    const back = pick('sparkmouse', golem)
    expect(back.gender).toBeUndefined()
    expect(back.ability).toBeUndefined()
  })

  it('changes nothing when it is the species already chosen, or one the data does not have', () => {
    const mouse = after([
      { choose: 'species', species: 'sparkmouse' },
      { choose: 'move', move: 'tackle' },
    ])
    expect(pick('sparkmouse', mouse)).toBe(mouse)
    expect(pick('nosuchmon', mouse)).toBe(mouse)
  })

  it('must be one the campaign offers', () => {
    const rules = testRules({ species: ['sparkmouse'] })
    expect(speciesProblem(emptyDraft, rules)).toBe('none-chosen')
    expect(speciesProblem(pick('stonegolem'), rules)).toBe('not-playable')
    expect(speciesProblem(pick('sparkmouse'), rules)).toBeUndefined()
  })
})

describe('the identity step', () => {
  const done = after([
    { choose: 'species', species: 'sparkmouse' },
    { choose: 'nickname', nickname: 'Volt' },
    { choose: 'gender', gender: 'F' },
    { choose: 'ability', ability: 'zap' },
    { choose: 'nature', nature: 'bold' },
  ])

  it('is done when a name, a gender, a nature and an Ability are chosen', () => {
    expect(identityProblems(done, context())).toEqual({})
  })

  it('says what is still missing', () => {
    expect(identityProblems(pick('sparkmouse'), context())).toEqual({ nickname: 'empty', gender: true, nature: true, ability: true })
  })

  it('checks the name as it is typed, tidied', () => {
    expect(identityProblems({ ...done, nickname: '  Volt  ' }, context())).toEqual({})
    expect(identityProblems({ ...done, nickname: 'Volt!' }, context())).toEqual({ nickname: 'characters' })
    expect(identityProblems({ ...done, nickname: 'x'.repeat(25) }, context())).toEqual({ nickname: 'too-long' })
  })

  it('asks for no nature where every Pokémon is neutral', () => {
    const withoutNature = after([
      { choose: 'species', species: 'sparkmouse' },
      { choose: 'nickname', nickname: 'Volt' },
      { choose: 'gender', gender: 'F' },
      { choose: 'ability', ability: 'zap' },
    ])
    expect(identityProblems(withoutNature, context(testRules({ natures: 'neutral' })))).toEqual({})
    expect(identityProblems(withoutNature, context())).toEqual({ nature: true })
  })

  it('refuses an Ability or a gender the species cannot have', () => {
    expect(identityProblems({ ...done, ability: 'sturdy', gender: 'N' }, context())).toEqual({ gender: true, ability: true })
  })
})

describe('placing roleplay attributes', () => {
  it('starts with the 300 points placed evenly, so the step is done as it stands', () => {
    expect(isStepDone('attributes', emptyDraft, context())).toBe(true)
  })

  it('is not done while some of the 300 points wait to be placed', () => {
    const lowered = after([{ choose: 'attribute', attribute: 'strength', value: 40 }])
    expect(isStepDone('attributes', lowered, context())).toBe(false)
    expect(isStepDone('attributes', after([{ choose: 'attribute', attribute: 'charisma', value: 60 }], undefined, lowered), context())).toBe(true)
  })

  it('never goes under 5', () => {
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 0 }]).attributes.strength).toBe(5)
  })

  it('goes over the 300 only as far as the level’s extra points allow', () => {
    // The test campaign starts at level 5: four extra points.
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 80 }]).attributes.strength).toBe(54)
    expect(attributeCeiling(emptyDraft.attributes, 'strength', 5)).toBe(54)
    // At level 1 there are none: nothing rises until something else is lowered.
    const levelOne = testRules({ startingLevel: 1 })
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 80 }], levelOne).attributes.strength).toBe(50)
    const moved = after(
      [
        { choose: 'attribute', attribute: 'charisma', value: 30 },
        { choose: 'attribute', attribute: 'strength', value: 80 },
      ],
      levelOne,
    )
    expect(moved.attributes.strength).toBe(70)
  })

  it('goes past 75, up to 95, when the level gives enough extra points', () => {
    const veteran = testRules({ startingLevel: 60 })
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 120 }], veteran).attributes.strength).toBe(95)
  })
})

describe('placing IVs and EVs', () => {
  it('stops at the budget of the level, and at each stat’s own limit', () => {
    // Level 5: 9 IV points and 25 EV points.
    const spent = after([
      { choose: 'iv', stat: 'hp', value: 6 },
      { choose: 'iv', stat: 'spe', value: 31 },
      { choose: 'ev', stat: 'atk', value: 300 },
    ])
    expect(spent.ivs).toMatchObject({ hp: 6, spe: 3 })
    expect(spent.evs.atk).toBe(25)
    const veteran = testRules({ startingLevel: 100 })
    expect(after([{ choose: 'iv', stat: 'spe', value: 99 }], veteran).ivs.spe).toBe(31)
    expect(after([{ choose: 'ev', stat: 'atk', value: 999 }], veteran).evs.atk).toBe(252)
  })

  it('gives points back when a stat is lowered', () => {
    const moved = after([
      { choose: 'iv', stat: 'hp', value: 9 },
      { choose: 'iv', stat: 'hp', value: 2 },
      { choose: 'iv', stat: 'atk', value: 31 },
    ])
    expect(moved.ivs).toMatchObject({ hp: 2, atk: 7 })
  })

  it('may leave points unplaced: the step is always done', () => {
    expect(isStepDone('training', emptyDraft, context())).toBe(true)
  })
})

describe('choosing moves', () => {
  const mouse = pick('sparkmouse')

  it('offers what the rules allow at the starting level, common moves included', () => {
    expect(movesOffered(mouse, context())).toEqual(['tackle', 'onechance', 'shared'])
    expect(movesOffered(mouse, context(testRules({ moveAccess: 'level-up-tm-tutor-egg' })))).toEqual(['tackle', 'onechance', 'tmwave', 'eggkick', 'shared'])
    expect(movesOffered(emptyDraft, context())).toEqual([])
  })

  it('adds a move, takes it back out, and ignores one that is not offered', () => {
    const one = after([{ choose: 'move', move: 'tackle' }], undefined, mouse)
    expect(one.moves).toEqual(['tackle'])
    expect(after([{ choose: 'move', move: 'megabolt' }], undefined, one).moves).toEqual(['tackle'])
    expect(after([{ choose: 'move', move: 'tackle' }], undefined, one).moves).toEqual([])
  })

  it('takes no more than six', () => {
    const wide = testRules({ startingLevel: 50, moveAccess: 'level-up-tm-tutor-egg' })
    const all = ['tackle', 'spark', 'megabolt', 'onechance', 'tmwave', 'eggkick', 'shared']
    const draft = after([{ choose: 'species', species: 'sparkmouse' }, ...all.map((move): DraftChoice => ({ choose: 'move', move }))], wide)
    expect(draft.moves).toEqual(all.slice(0, 6))
  })

  it('needs at least one', () => {
    expect(isStepDone('moves', mouse, context())).toBe(false)
    expect(isStepDone('moves', after([{ choose: 'move', move: 'tackle' }], undefined, mouse), context())).toBe(true)
  })
})

describe('choosing an item pack', () => {
  it('is needed, and must be one of the campaign’s', () => {
    expect(isStepDone('items', emptyDraft, context())).toBe(false)
    expect(isStepDone('items', after([{ choose: 'pack', pack: 1 }]), context())).toBe(true)
    expect(after([{ choose: 'pack', pack: 7 }]).pack).toBeUndefined()
  })

  it('lets the Pokémon hold one item of the pack, if it can be held', () => {
    const explorer = after([{ choose: 'pack', pack: 0 }])
    expect(after([{ choose: 'held', item: 'berry' }], undefined, explorer).heldItem).toBe('berry')
    // A Potion cannot be held; a rope is in the other pack.
    expect(after([{ choose: 'held', item: 'potion' }], undefined, explorer).heldItem).toBeUndefined()
    expect(after([{ choose: 'held', item: 'rope' }], undefined, explorer).heldItem).toBeUndefined()
  })

  it('puts the held item back when another pack is chosen, or when asked', () => {
    const holding = after([
      { choose: 'pack', pack: 0 },
      { choose: 'held', item: 'berry' },
    ])
    expect(after([{ choose: 'pack', pack: 1 }], undefined, holding).heldItem).toBeUndefined()
    expect(after([{ choose: 'held', item: undefined }], undefined, holding).heldItem).toBeUndefined()
  })
})

describe('the character a finished draft makes', () => {
  const invitation: Invitation = { campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules() }
  const finished = after([
    { choose: 'species', species: 'sparkmouse' },
    { choose: 'nickname', nickname: '  Volt ' },
    { choose: 'gender', gender: 'F' },
    { choose: 'ability', ability: 'zap' },
    { choose: 'nature', nature: 'bold' },
    { choose: 'attribute', attribute: 'charisma', value: 54 },
    { choose: 'iv', stat: 'spe', value: 9 },
    { choose: 'ev', stat: 'hp', value: 25 },
    { choose: 'move', move: 'tackle' },
    { choose: 'move', move: 'shared' },
    { choose: 'pack', pack: 0 },
    { choose: 'held', item: 'berry' },
  ])

  it('passes every rule of creation', () => {
    expect(STEPS.every((step) => isStepDone(step, finished, context()))).toBe(true)
    expect(creationProblems(finished, invitation, testPack)).toEqual([])
  })

  it('starts at the campaign’s level and money, at full HP and PP, with its pack', () => {
    const character = toCharacter(finished, invitation, testPack, 'character-0009')
    expect(character).toMatchObject({
      id: 'character-0009',
      campaign: { id: 'campaign-0001', name: 'Test', rulesVersion: 1 },
      nickname: 'Volt',
      level: 5,
      exp: 125,
      money: 500,
      nature: 'bold',
      moves: [
        { id: 'tackle', ppUps: 0, pp: 35 },
        { id: 'shared', ppUps: 0, pp: 10 },
      ],
      heldItem: 'berry',
      bag: [{ item: 'potion', quantity: 3 }],
      condition: { state: 'standing' },
    })
    // Full HP, whatever its points make its maximum.
    expect(character && character.hp).toBe(character && maxHpOf(character, testPack))
    // 304 points in all: the 300 of creation, and the four that level 5 adds.
    expect(character && attributeScores(character.attributes)).toMatchObject({ charisma: 54, strength: 50 })
    expect(character && unplacedPoints(character.attributes, 5)).toBe(0)
  })

  it('holds nothing and keeps the whole pack when no item was chosen to hold', () => {
    const character = toCharacter(after([{ choose: 'held', item: undefined }], undefined, finished), invitation, testPack, 'character-0009')
    expect(character?.heldItem).toBeUndefined()
    expect(character?.bag).toEqual([
      { item: 'potion', quantity: 3 },
      { item: 'berry', quantity: 1 },
    ])
  })

  it('has no nature where every Pokémon is neutral, whatever was picked before', () => {
    const neutral: Invitation = { ...invitation, rules: testRules({ natures: 'neutral' }) }
    const character = toCharacter(finished, neutral, testPack, 'character-0009')
    expect(character && 'nature' in character).toBe(false)
    expect(creationProblems(finished, neutral, testPack)).toEqual([])
  })

  it('is not made while a step is unfinished', () => {
    const noName = after([{ choose: 'nickname', nickname: '' }], undefined, finished)
    expect(toCharacter(noName, invitation, testPack, 'character-0009')).toBeUndefined()
    expect(creationProblems({ ...finished, moves: [] }, invitation, testPack)).toBeUndefined()
  })
})
