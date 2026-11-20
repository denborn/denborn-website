import { describe, expect, it } from 'vitest'
import { testPack, testRules } from '../../domain/test-pack'
import type { Invitation } from '../../shared/codec/codes'
import { type CreationDraft, type DraftChoice, STEPS, creationProblems } from './draft'
import { FLOW_STEPS, type Flow, type FlowEntry, NEW_FLOW, flowAfter, flowFor, stepBefore, stepStates } from './flow'

const invitation: Invitation = { campaign: { id: 'campaign-0001', name: 'Test' }, dataPackVersion: 'test-pack', rules: testRules() }
const entry: FlowEntry = { invitation, pack: testPack, campaignLocked: false }
const started: Flow = { ...NEW_FLOW, campaign: invitation.campaign.id }

const choices = (flow: Flow, made: DraftChoice[]): Flow => made.reduce((now, choice) => flowAfter(now, { do: 'choose', choice }, entry), flow)
const nexts = (flow: Flow, times: number): Flow => Array.from({ length: times }).reduce<Flow>((now) => flowAfter(now, { do: 'next' }, entry), flow)

/** Everything a character needs, chosen. */
const ALL: DraftChoice[] = [
  { choose: 'species', species: 'sparkmouse' },
  { choose: 'nickname', nickname: 'Volt' },
  { choose: 'gender', gender: 'F' },
  { choose: 'ability', ability: 'zap' },
  { choose: 'nature', nature: 'bold' },
  // The roleplay points start at 5 and may wait (decisions 302 and 307): none is placed here.
  { choose: 'slot', slot: 0, move: 'tackle' },
  { choose: 'pack', pack: 0 },
]

describe('the campaign a draft is made for', () => {
  const working: Flow = { ...started, draft: { ...started.draft, nickname: 'Volt' }, at: 'identity', reached: 'identity' }

  it('keeps the draft when it is the same one, or when the player is back at choosing one', () => {
    expect(flowFor(working, 'campaign-0001')).toBe(working)
    expect(flowFor(working, undefined)).toBe(working)
  })

  it('starts a draft over for another one', () => {
    expect(flowFor(working, 'campaign-0002')).toEqual({ ...NEW_FLOW, campaign: 'campaign-0002' })
  })
})

describe('the steps that can be gone to', () => {
  it('are none but the campaign’s before a campaign is chosen', () => {
    const states = stepStates(NEW_FLOW, { ...entry, invitation: undefined })
    expect(states.campaign).toEqual({ done: false, open: true })
    expect(STEPS.every((step) => !states[step].open && !states[step].done)).toBe(true)
  })

  it('are the campaign’s and the first once a campaign is chosen', () => {
    const states = stepStates(started, entry)
    expect(states.campaign).toEqual({ done: true, open: true })
    expect(states.species).toEqual({ done: false, open: true })
    expect(states.identity.open).toBe(false)
  })

  it('never include the campaign’s when creation was started for one campaign', () => {
    expect(stepStates(started, { ...entry, campaignLocked: true }).campaign).toEqual({ done: true, open: false })
  })

  it('go as far as the player has been, each step before having what it needs', () => {
    const through = nexts(choices(started, ALL), 6)
    expect(through.at).toBe('review')
    const states = stepStates(through, entry)
    expect(STEPS.every((step) => states[step].open && states[step].done)).toBe(true)
  })

  it('stop at a step that still needs something', () => {
    // No name yet: the identity cannot be gone on from.
    const held = nexts(choices(started, [{ choose: 'species', species: 'sparkmouse' }]), 3)
    expect(held.at).toBe('identity')
    expect(held.reached).toBe('identity')
    expect(stepStates(held, entry).combat.open).toBe(false)
  })

  it('shut after a step an earlier choice undid, and open again once it is made again', () => {
    const through = nexts(choices(started, ALL), 6)
    // Another Pokémon has other moves: they start over.
    const other = flowAfter(flowAfter(through, { do: 'go', step: 'species' }, entry), { do: 'choose', choice: { choose: 'species', species: 'stonegolem' } }, entry)
    const states = stepStates(other, entry)
    expect(states.moves).toEqual({ done: false, open: true })
    expect(states.items.open).toBe(false)
    expect(states.review).toEqual({ done: false, open: false })
    const again = choices(other, [{ choose: 'slot', slot: 0, move: 'tackle' }])
    expect(stepStates(again, entry).review).toEqual({ done: true, open: true })
  })
})

describe('the back arrow', () => {
  it('goes to the step before the one shown, one at a time, down to the campaign’s', () => {
    const walked: (string | undefined)[] = []
    for (let step = stepBefore('review', false); step; step = stepBefore(step, false)) walked.push(step)
    expect(walked).toEqual([...FLOW_STEPS].reverse().slice(1))
  })

  it('leaves the Pokédex from the first step', () => {
    expect(stepBefore('campaign', false)).toBeUndefined()
  })

  it('leaves the Pokédex from the Pokémon’s step when creation was started for one campaign', () => {
    expect(stepBefore('species', true)).toBeUndefined()
    expect(stepBefore('identity', true)).toBe('species')
  })

  it('goes to a step that is open, since the player came through it', () => {
    const atMoves = nexts(choices(started, ALL), 4)
    expect(atMoves.at).toBe('moves')
    const before = stepBefore(atMoves.at, false)
    expect(before && stepStates(atMoves, entry)[before].open).toBe(true)
  })
})

describe('going from step to step', () => {
  const through = nexts(choices(started, ALL), 6)

  it('goes back to any step open, and loses nothing', () => {
    const back = flowAfter(through, { do: 'go', step: 'identity' }, entry)
    expect(back).toEqual({ ...through, at: 'identity' })
    expect(back.reached).toBe('review')
  })

  it('does not go to a step that is not open', () => {
    expect(flowAfter(started, { do: 'go', step: 'moves' }, entry)).toBe(started)
  })

  it('does nothing without a campaign', () => {
    expect(flowAfter(NEW_FLOW, { do: 'next' }, { ...entry, invitation: undefined })).toBe(NEW_FLOW)
  })

  it('has the last look done exactly when the character can be made', () => {
    const drafts: CreationDraft[] = [through.draft, { ...through.draft, moves: [] }, { ...through.draft, nickname: '' }]
    for (const draft of drafts) {
      expect(stepStates({ ...through, draft }, entry).review.done).toBe(creationProblems(draft, invitation, testPack)?.length === 0)
    }
  })
})
