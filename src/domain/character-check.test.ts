import { describe, expect, it } from 'vitest'
import { expForLevel } from '../game-rules/exp'
import type { CharacterDocument } from '../shared/schema/character'
import { type CharacterProblem, type CreationProblem, checkCharacter, checkCreation, maxHpOf } from './character-check'
import { newcomer, testPack, testRules } from './test-pack'

const kinds = (problems: readonly (CharacterProblem | CreationProblem)[]): string[] => problems.map((problem) => problem.kind)
const check = (changes: Partial<CharacterDocument>, rules = testRules()): string[] => kinds(checkCharacter(newcomer(changes), rules, testPack))
const create = (changes: Partial<CharacterDocument>, rules = testRules()): string[] => kinds(checkCreation(newcomer(changes), rules, testPack))

describe('a character at any time', () => {
  it('is accepted when everything follows its rules', () => {
    expect(check({})).toEqual([])
  })

  it('is refused when checked against another version of the rules', () => {
    expect(checkCharacter(newcomer(), testRules({ version: 2 }), testPack)).toEqual([{ kind: 'other-rules-version', character: 1, rules: 2 }])
  })

  it.each([
    ['a species the data does not have', { species: 'nosuchmon' }, 'unknown-species'],
    ['a gender its species cannot be', { species: 'stonegolem', gender: 'F' as const, ability: 'sturdy' }, 'gender'],
    ['an Ability its species cannot have', { ability: 'sturdy' }, 'ability'],
    ['a nature the data does not have', { nature: 'nosuchnature' }, 'unknown-nature'],
    ['no nature where players choose one', { nature: undefined }, 'nature-missing'],
    ['EXP that is not its level’s', { exp: expForLevel(6) }, 'exp-does-not-match-level'],
    ['a level under the campaign’s starting level', { level: 4, exp: expForLevel(4) }, 'below-starting-level'],
    ['a held item that cannot be held', { heldItem: 'potion' }, 'held-item'],
    ['a bag item the data does not have', { bag: [{ item: 'nosuchitem', quantity: 1 }] }, 'unknown-item'],
    ['the same item in two stacks', { bag: [{ item: 'potion', quantity: 1 }, { item: 'potion', quantity: 2 }] }, 'repeated-item'],
    ['a name with a character that is not allowed', { nickname: 'Volt!' }, 'nickname'],
    ['a name stored untidied', { nickname: ' Volt' }, 'nickname'],
  ])('is refused with %s', (_, changes, problem) => {
    expect(check(changes)).toContain(problem)
  })

  it('must have no nature when the campaign makes every Pokémon neutral', () => {
    const neutral = testRules({ natures: 'neutral' })
    expect(check({ nature: 'bold' }, neutral)).toEqual(['nature-not-allowed'])
    expect(check({ nature: undefined }, neutral)).toEqual([])
  })

  it('reports each broken budget with its detail', () => {
    const problems = checkCharacter(newcomer({ ivs: { hp: 10, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }), testRules(), testPack)
    // At level 5 there are 9 IV points.
    expect(problems).toEqual([{ kind: 'ivs', problem: { kind: 'over-budget', by: 1 } }])
  })

  it('reports each broken attribute rule with its detail', () => {
    const attributes = newcomer().attributes
    const problems = checkCharacter(newcomer({ attributes: { ...attributes, gained: { ...attributes.gained, charisma: 5 } } }), testRules(), testPack)
    // Level 5 gives 4 points.
    expect(problems).toEqual([{ kind: 'attributes', problem: { kind: 'too-many-gained', by: 1 } }])
  })
})

describe('a character’s moves', () => {
  const slot = (id: string, pp: number, ppUps = 0) => ({ id, pp, ppUps })

  it('may be level-up moves at or under its level, and the campaign’s common moves', () => {
    expect(check({ moves: [slot('tackle', 35), slot('shared', 10)] })).toEqual([])
    expect(check({ moves: [slot('spark', 20)] })).toEqual(['move-not-eligible'])
    expect(check({ level: 10, exp: expForLevel(10), moves: [slot('spark', 20)] })).toEqual([])
  })

  it('may be TM and egg moves only when the campaign allows them', () => {
    const moves = [slot('tmwave', 20), slot('eggkick', 15)]
    expect(check({ moves })).toEqual(['move-not-eligible', 'move-not-eligible'])
    expect(check({ moves }, testRules({ moveAccess: 'level-up-tm-tutor-egg' }))).toEqual([])
  })

  it('cannot be the same move twice, nor a move the data does not have', () => {
    expect(check({ moves: [slot('tackle', 35), slot('tackle', 35)] })).toEqual(['repeated-move'])
    expect(check({ moves: [slot('nosuchmove', 1)] })).toEqual(['unknown-move'])
  })

  it('have at most their base PP, plus a fifth per PP Up', () => {
    expect(check({ moves: [slot('tackle', 36)] })).toEqual(['pp-above-max'])
    expect(check({ moves: [slot('tackle', 42, 1)] })).toEqual([])
    expect(check({ moves: [slot('tackle', 43, 1)] })).toEqual(['pp-above-max'])
  })

  it('cannot take a PP Up when their PP are fixed', () => {
    expect(check({ moves: [slot('onechance', 1, 1)] })).toEqual(['pp-ups-not-allowed'])
  })
})

describe('a character’s HP and condition', () => {
  const full = maxHpOf(newcomer(), testPack) ?? 0

  it('standing: between 1 and its maximum', () => {
    expect(check({ hp: 1 })).toEqual([])
    expect(check({ hp: 0 })).toEqual(['hp'])
    expect(check({ hp: full + 1 })).toEqual(['hp'])
  })

  it('downed or dead: no HP, and no status condition', () => {
    expect(check({ hp: 0, condition: { state: 'downed', stacks: 2 } })).toEqual([])
    expect(check({ hp: 3, condition: { state: 'downed', stacks: 2 } })).toEqual(['hp'])
    expect(check({ hp: 0, condition: { state: 'dead' }, status: 'psn' })).toEqual(['status-while-down'])
  })
})

describe('a character just created', () => {
  it('is accepted at the starting level, with full HP and PP, the starting money and one item pack', () => {
    expect(create({})).toEqual([])
  })

  it('may hold nothing, with the whole pack in its bag', () => {
    expect(create({ heldItem: undefined, bag: [{ item: 'berry', quantity: 1 }, { item: 'potion', quantity: 3 }] })).toEqual([])
  })

  it.each([
    ['a species the campaign does not offer', { species: 'stonegolem', gender: 'N' as const, ability: 'sturdy' }, testRules({ species: ['sparkmouse'] }), 'species-not-playable'],
    ['a level above the starting level', { level: 6, exp: expForLevel(6) }, testRules(), 'not-starting-level'],
    ['EXP beyond the level’s threshold', { exp: expForLevel(5) + 1 }, testRules(), 'not-starting-level'],
    ['other money than the starting money', { money: 501 }, testRules(), 'not-starting-money'],
    ['less than full HP', { hp: 1 }, testRules(), 'not-full-hp'],
    ['a status condition', { status: 'par' as const }, testRules(), 'not-full-hp'],
    ['a move short of PP', { moves: [{ id: 'tackle', ppUps: 0, pp: 34 }] }, testRules(), 'pp-not-full'],
    ['items that are no pack', { bag: [{ item: 'potion', quantity: 2 }] }, testRules(), 'not-an-item-pack'],
    ['two packs at once', { bag: [{ item: 'potion', quantity: 3 }, { item: 'rope', quantity: 1 }] }, testRules(), 'not-an-item-pack'],
  ])('is refused with %s', (_, changes, rules, problem) => {
    expect(create(changes, rules)).toEqual([problem])
  })
})
