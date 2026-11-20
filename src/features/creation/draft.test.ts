import { describe, expect, it } from 'vitest'
import { maxHpOf } from '../../domain/character-check'
import { ATTRIBUTE_IDS, CREATION_MIN, attributeScores, unplacedPoints } from '../../game-rules/attributes'
import { tvOf } from '../../game-rules/training'
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

  it('leaves the gender to choose when the species has both, and takes its first Ability until another is chosen (decision 304)', () => {
    const draft = pick('sparkmouse')
    expect(draft.gender).toBeUndefined()
    expect(draft.ability).toBe(testPack.species.sparkmouse?.abilities[0])
  })

  it('keeps an Ability chosen before where the next species can have it', () => {
    const second = testPack.species.sparkmouse?.abilities[1]
    if (!second) throw new Error('The test mouse lost its second Ability')
    const chosen = after([{ choose: 'ability', ability: second }], undefined, pick('sparkmouse'))
    expect(chosen.ability).toBe(second)
  })

  it('keeps the name and the points, drops what no longer fits, and starts the moves over', () => {
    const mouse = after([
      { choose: 'species', species: 'sparkmouse' },
      { choose: 'nickname', nickname: 'Volt' },
      { choose: 'gender', gender: 'F' },
      { choose: 'ability', ability: 'zap' },
      { choose: 'nature', nature: 'bold' },
      { choose: 'tv', stat: 'spe', value: 5 },
      { choose: 'move', move: 'tackle' },
    ])
    const golem = pick('stonegolem', mouse)
    expect(golem).toMatchObject({ nickname: 'Volt', species: 'stonegolem', gender: 'N', ability: 'sturdy', nature: 'bold', moves: [] })
    expect(golem.ivs.spe).toBe(5)
    // Back again: a gender that does not fit a species with a choice is dropped; an Ability that does not fit gives way to its first.
    const back = pick('sparkmouse', golem)
    expect(back.gender).toBeUndefined()
    expect(back.ability).toBe('zap')
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
    expect(identityProblems(pick('sparkmouse'), context())).toEqual({ nickname: 'empty', gender: true, nature: true })
    expect(identityProblems(emptyDraft, context())).toEqual({ nickname: 'empty', gender: true, nature: true, ability: true })
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

describe('the combat step', () => {
  const named = after([
    { choose: 'species', species: 'sparkmouse' },
    { choose: 'nickname', nickname: 'Volt' },
    { choose: 'gender', gender: 'F' },
  ])

  it('is done with an Ability, whatever the name and the nature (decision 306)', () => {
    expect(isStepDone('combat', { ...named, nickname: '' }, context())).toBe(true)
    expect(isStepDone('combat', { ...named, ability: 'sturdy' }, context())).toBe(false)
  })

  it('leaves the nature to the TV step, which needs it where natures are chosen (decision 306)', () => {
    expect(isStepDone('training', named, context())).toBe(false)
    expect(isStepDone('training', after([{ choose: 'nature', nature: 'bold' }], undefined, named), context())).toBe(true)
    expect(isStepDone('training', named, context(testRules({ natures: 'neutral' })))).toBe(true)
  })
})

/** The 265 points of creation all placed: 45 in strength, 44 in each of the others. */
const FULL_CHOICES: DraftChoice[] = ATTRIBUTE_IDS.map((attribute) => ({ choose: 'attribute', attribute, value: attribute === 'strength' ? 45 : 44 }))
const FULL = after(FULL_CHOICES)

describe('placing roleplay attributes', () => {
  const named = after([
    { choose: 'species', species: 'sparkmouse' },
    { choose: 'nickname', nickname: 'Volt' },
    { choose: 'gender', gender: 'F' },
  ])

  it('starts every attribute at the least (decision 302), and lets the points wait (decision 307)', () => {
    expect(ATTRIBUTE_IDS.every((attribute) => emptyDraft.attributes[attribute] === CREATION_MIN)).toBe(true)
    expect(isStepDone('identity', named, context())).toBe(true)
    expect(isStepDone('identity', after(FULL_CHOICES, undefined, named), context())).toBe(true)
  })

  it('never goes under 5', () => {
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 0 }]).attributes.strength).toBe(5)
  })

  it('goes over the 300 only as far as the level’s extra points allow', () => {
    // The test campaign starts at level 5: four extra points.
    // All 265 placed: strength rises by the four extra points only.
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 80 }], undefined, FULL).attributes.strength).toBe(49)
    expect(attributeCeiling(FULL.attributes, 'strength', 5)).toBe(49)
    // At level 1 there are none: nothing rises until something else is lowered.
    const levelOne = testRules({ startingLevel: 1 })
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 80 }], levelOne, FULL).attributes.strength).toBe(45)
    const moved = after(
      [
        { choose: 'attribute', attribute: 'charisma', value: 24 },
        { choose: 'attribute', attribute: 'strength', value: 80 },
      ],
      levelOne,
      FULL,
    )
    expect(moved.attributes.strength).toBe(65)
  })

  it('goes past 75, up to 95, when the level gives enough extra points', () => {
    const veteran = testRules({ startingLevel: 60 })
    expect(after([{ choose: 'attribute', attribute: 'strength', value: 120 }], veteran, FULL).attributes.strength).toBe(95)
  })
})

describe('placing TV', () => {
  it('stops at the TV of the level, and at what one stat takes', () => {
    // Level 5: 15 TV.
    const spent = after([
      { choose: 'tv', stat: 'hp', value: 6 },
      { choose: 'tv', stat: 'spe', value: 31 },
    ])
    expect(tvOf(spent)).toMatchObject({ hp: 6, spe: 9 })
    expect(after([{ choose: 'tv', stat: 'atk', value: 999 }], testRules({ startingLevel: 100 }))).toMatchObject({ ivs: { atk: 31 }, evs: { atk: 252 } })
  })

  it('gives points back when a stat is lowered', () => {
    const moved = after([
      { choose: 'tv', stat: 'hp', value: 15 },
      { choose: 'tv', stat: 'hp', value: 2 },
      { choose: 'tv', stat: 'atk', value: 31 },
    ])
    expect(tvOf(moved)).toMatchObject({ hp: 2, atk: 13 })
  })

  it('may leave TV unplaced, and is not done with more than the level gives', () => {
    // With its nature chosen, which the TV step asks for too (decision 306).
    const natured = { ...emptyDraft, nature: 'bold' }
    expect(isStepDone('training', natured, context())).toBe(true)
    expect(isStepDone('training', { ...natured, ivs: { ...emptyDraft.ivs, hp: 16 } }, context())).toBe(false)
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

  it('needs at least one (decision 293)', () => {
    expect(isStepDone('moves', mouse, context())).toBe(false)
    expect(isStepDone('moves', after([{ choose: 'move', move: 'tackle' }], undefined, mouse), context())).toBe(true)
  })

  it('needs every one of them to be offered still', () => {
    // A draft from elsewhere, or made under other rules: a move this Pokémon is not offered.
    expect(isStepDone('moves', { ...mouse, moves: ['tackle', 'megabolt'] }, context())).toBe(false)
  })
})

describe('the six places of its moves', () => {
  const mouse = pick('sparkmouse')
  const put = (slot: number, move: string | undefined, from: CreationDraft = mouse): CreationDraft => after([{ choose: 'slot', slot, move }], undefined, from)

  it('fill from the first, whichever place is pressed', () => {
    expect(put(4, 'tackle').moves).toEqual(['tackle'])
    expect(put(1, 'shared', put(4, 'tackle')).moves).toEqual(['tackle', 'shared'])
  })

  it('take another move in the place of the one there', () => {
    const two = put(1, 'shared', put(0, 'tackle'))
    expect(put(0, 'onechance', two).moves).toEqual(['onechance', 'shared'])
  })

  it('are emptied, the moves after closing up', () => {
    const two = put(1, 'shared', put(0, 'tackle'))
    expect(put(0, undefined, two).moves).toEqual(['shared'])
    expect(put(3, undefined, two)).toBe(two)
  })

  it('refuse a move known in another place, and one that is not offered', () => {
    const two = put(1, 'shared', put(0, 'tackle'))
    expect(put(1, 'tackle', two)).toBe(two)
    expect(put(2, 'megabolt', two)).toBe(two)
  })

  it('are six at most', () => {
    const wide = testRules({ startingLevel: 50, moveAccess: 'level-up-tm-tutor-egg' })
    const six = after([{ choose: 'species', species: 'sparkmouse' }, ...['tackle', 'spark', 'megabolt', 'onechance', 'tmwave', 'eggkick'].map((move, slot): DraftChoice => ({ choose: 'slot', slot, move }))], wide)
    expect(six.moves).toHaveLength(6)
    expect(after([{ choose: 'slot', slot: 6, move: 'shared' }], wide, six)).toBe(six)
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
    ...FULL_CHOICES,
    { choose: 'attribute', attribute: 'charisma', value: 48 },
    { choose: 'tv', stat: 'spe', value: 9 },
    { choose: 'tv', stat: 'hp', value: 6 },
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
    expect(character && attributeScores(character.attributes)).toMatchObject({ charisma: 48, strength: 45 })
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
