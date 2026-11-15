import { describe, expect, it } from 'vitest'
import { testPack, testRules } from '../../domain/test-pack'
import type { CampaignDocument } from '../../shared/schema/campaign'
import { type CreationDraft, choose, emptyDraft } from '../creation/draft'
import { type EncounterDraft, type EnemyDraft, NEW_ENCOUNTER, draftOfEncounter, encounterOf, encounterState, enemyContext, enemyOf, enemyState, hasChanges, moved, newEnemy, withEncounter, withoutEncounter } from './encounter-draft'

const rules = testRules()

/** A golem with everything chosen. */
const golemBuild: CreationDraft = { ...emptyDraft, species: 'stonegolem', gender: 'N', nature: 'bold', ability: 'sturdy', moves: ['tackle'] }
const golem = (id: string, changes: Partial<EnemyDraft> = {}): EnemyDraft => ({ ...newEnemy(id, rules), build: golemBuild, ...changes })
const draft = (changes: Partial<EncounterDraft> = {}): EncounterDraft => ({ name: 'The quarry', enemies: [golem('enemy-0001')], bag: [], ...changes })

describe('an enemy being built', () => {
  it('starts at the level characters start at, a minion that faints, with the rest to choose', () => {
    const added = newEnemy('enemy-0001', testRules({ startingLevel: 12 }))
    expect(added).toMatchObject({ level: 12, class: 'minion', agony: false })
    expect(enemyState(added, rules, testPack)).toEqual({ gaps: ['species', 'gender', 'nature', 'ability', 'moves'], problems: [] })
    expect(enemyOf(added, rules)).toBeUndefined()
  })

  it('needs no nature where every Pokémon is neutral, and keeps none', () => {
    const neutral = testRules({ natures: 'neutral' })
    expect(enemyState(golem('enemy-0001'), neutral, testPack).gaps).toEqual([])
    expect(enemyOf(golem('enemy-0001'), neutral)).not.toHaveProperty('nature')
  })

  it('may be of any species of the game data, at its own level, whatever the campaign lets players create', () => {
    const context = enemyContext(testRules({ species: ['sparkmouse'], startingLevel: 5 }), testPack, 40)
    expect(context.rules.species).toEqual(['sparkmouse', 'stonegolem'])
    // At level 40 the mouse may know the move it learns at 40; at 5 it could not.
    const mouse = choose(emptyDraft, { choose: 'species', species: 'sparkmouse' }, context)
    expect(choose(mouse, { choose: 'move', move: 'megabolt' }, context).moves).toEqual(['megabolt'])
  })

  it('goes by its species’ name when no name was typed, and keeps a typed one tidy', () => {
    expect(enemyOf(golem('enemy-0001'), rules)).not.toHaveProperty('nickname')
    expect(enemyOf(golem('enemy-0001', { build: { ...golemBuild, nickname: '  Old   Stone ' } }), rules)?.nickname).toBe('Old Stone')
  })

  it('says what its build breaks once its level was lowered under what it spent', () => {
    const spent = golem('enemy-0001', { level: 5, build: { ...golemBuild, ivs: { hp: 20, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } } })
    expect(enemyState(spent, rules, testPack).problems).toEqual([{ kind: 'ivs', problem: { kind: 'over-budget', by: 11 } }])
  })
})

describe('an encounter being prepared', () => {
  it('needs a name and at least one enemy, each with nothing left to choose', () => {
    expect(encounterState(NEW_ENCOUNTER, rules, testPack)).toMatchObject({ gaps: ['name', 'enemies'], ready: false })
    expect(encounterState(draft({ enemies: [golem('enemy-0001'), newEnemy('enemy-0002', rules)] }), rules, testPack)).toMatchObject({ gaps: [], ready: false })
    expect(encounterState(draft(), rules, testPack)).toMatchObject({ gaps: [], problems: [], ready: true })
  })

  it('is not ready while its Bag holds what does nothing from a Bag', () => {
    const state = encounterState(draft({ bag: [{ item: 'rope', quantity: 1 }] }), rules, testPack)
    expect(state).toMatchObject({ ready: false, problems: [{ kind: 'not-a-bag-item', item: 'rope' }] })
  })

  it('keeps its enemies in the order they stand, and moves one a place at a time', () => {
    const line = [golem('enemy-0001'), golem('enemy-0002'), golem('enemy-0003')]
    const ids = (enemies: readonly EnemyDraft[]): string[] => enemies.map((enemy) => enemy.id)
    expect(ids(moved(line, 'enemy-0001', 1))).toEqual(['enemy-0002', 'enemy-0001', 'enemy-0003'])
    expect(ids(moved(line, 'enemy-0003', -1))).toEqual(['enemy-0001', 'enemy-0003', 'enemy-0002'])
    // Already at that end: nothing moves.
    expect(ids(moved(line, 'enemy-0001', -1))).toEqual(ids(line))
    expect(encounterOf(draft({ enemies: moved(line, 'enemy-0001', 1) }), 'encounter-0001', rules)?.enemies.map((enemy) => enemy.id)).toEqual(['enemy-0002', 'enemy-0001', 'enemy-0003'])
  })

  it('reads back from its saved form as it was', () => {
    const elder = golem('enemy-0001', { level: 30, class: 'boss', agony: true, build: { ...golemBuild, nickname: 'Old Stone', heldItem: 'berry' } })
    const saved = encounterOf(draft({ enemies: [elder], bag: [{ item: 'potion', quantity: 2 }] }), 'encounter-0001', rules)
    expect(saved).toBeDefined()
    if (saved) expect(encounterOf(draftOfEncounter(saved), 'encounter-0001', rules)).toEqual(saved)
  })

  it('knows changes not saved yet, against one not begun and against the one kept', () => {
    expect(hasChanges(NEW_ENCOUNTER, undefined)).toBe(false)
    expect(hasChanges(draft(), undefined)).toBe(true)
    const kept = encounterOf(draft(), 'encounter-0001', rules)
    expect(kept && hasChanges(draftOfEncounter(kept), kept)).toBe(false)
    expect(kept && hasChanges({ ...draftOfEncounter(kept), name: 'The pit' }, kept)).toBe(true)
  })
})

describe('a campaign’s encounters', () => {
  const campaign: CampaignDocument = { kind: 'denborn.campaign', schemaVersion: 1, id: 'campaign-0001', revision: 3, dataPackVersion: 'test-pack', name: 'Test', rulesHistory: [rules], characters: [], encounters: [] }
  const made = (id: string, name: string) => {
    const encounter = encounterOf(draft({ name }), id, rules)
    if (!encounter) throw new Error('The draft should make an encounter')
    return encounter
  }

  it('gain one, keep its place when it is saved again, and lose one, each a change of the campaign and none of its rules', () => {
    const two = withEncounter(withEncounter(campaign, made('encounter-0001', 'The quarry')), made('encounter-0002', 'The pit'))
    expect(two.encounters.map((encounter) => encounter.name)).toEqual(['The quarry', 'The pit'])
    const renamed = withEncounter(two, made('encounter-0001', 'The old quarry'))
    expect(renamed.encounters.map((encounter) => encounter.name)).toEqual(['The old quarry', 'The pit'])
    expect(withoutEncounter(renamed, 'encounter-0001').encounters.map((encounter) => encounter.name)).toEqual(['The pit'])
    expect(renamed).toMatchObject({ revision: 6, rulesHistory: [{ version: 1 }] })
  })
})
