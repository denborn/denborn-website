/**
 * The way through character creation (decisions 101 and 289): the campaign
 * first, then the seven steps of the draft. It says which step is shown, how
 * far the player has been, and which steps can be gone to. Pure: the page
 * holds one of these and sends what the player does.
 *
 * A draft is made under one campaign's rules. The same campaign chosen again
 * finds the draft as it was; another campaign starts a new one.
 */
import type { DataPack } from '../../data/types.ts'
import type { Invitation } from '../../shared/codec/codes.ts'
import { type CreationDraft, type DraftChoice, STEPS, type StepId, choose, creationProblems, emptyDraft, isStepDone } from './draft.ts'

/** The steps of creation, the campaign's first. */
export const FLOW_STEPS = ['campaign', ...STEPS] as const
export type FlowStep = (typeof FLOW_STEPS)[number]

export interface Flow {
  /** The campaign the draft is made for; nothing until one is chosen. */
  campaign: string | undefined
  draft: CreationDraft
  /** The step shown once past the campaign's. */
  at: StepId
  /** The furthest step the player has been to. */
  reached: StepId
}

/** Nothing chosen yet. */
export const NEW_FLOW: Flow = { campaign: undefined, draft: emptyDraft, at: 'species', reached: 'species' }

const placeOf = (step: StepId): number => STEPS.indexOf(step)

/** The flow for the campaign in the address: as it is for the campaign it was for, or for none; started over for another. */
export function flowFor(flow: Flow, campaign: string | undefined): Flow {
  if (campaign === undefined || campaign === flow.campaign) return flow
  return { ...NEW_FLOW, campaign }
}

export interface StepState {
  /** It has what it needs. */
  done: boolean
  /** It can be gone to. */
  open: boolean
}

/** What a flow is judged against: the campaign chosen, when there is one, and the game data. */
export interface FlowEntry {
  /** The campaign of the address, when this device has it. */
  invitation: Invitation | undefined
  pack: DataPack
  /** Creation was started for one campaign, from a session: there is no other to choose. */
  campaignLocked: boolean
}

/**
 * Each step's state. A step is open when the player has been as far and every
 * step before it has what it needs: a choice that undoes a later step (another
 * Pokémon has other moves) shuts what comes after it until it is made again.
 * The last look is done when the character can be made.
 */
export function stepStates(flow: Flow, { invitation, pack, campaignLocked }: FlowEntry): Record<FlowStep, StepState> {
  const stepDone = (step: StepId): boolean => {
    if (!invitation) return false
    if (step === 'review') return creationProblems(flow.draft, invitation, pack)?.length === 0
    return isStepDone(step, flow.draft, { pack, rules: invitation.rules })
  }
  const states = { campaign: { done: invitation !== undefined, open: !campaignLocked } } as Record<FlowStep, StepState>
  let before = invitation !== undefined
  for (const step of STEPS) {
    const done = stepDone(step)
    states[step] = { done, open: before && placeOf(step) <= placeOf(flow.reached) }
    before = before && done
  }
  return states
}

/**
 * Where the back arrow goes from the step shown (decision 300): the step
 * before it, one at a time. Nothing from the first step, nor from the
 * Pokémon's when creation was started for one campaign: the arrow leaves the
 * Pokédex then. A step before the one shown is always open, since the player
 * came through it.
 */
export function stepBefore(step: FlowStep, campaignLocked: boolean): FlowStep | undefined {
  const before = FLOW_STEPS[FLOW_STEPS.indexOf(step) - 1]
  return before === 'campaign' && campaignLocked ? undefined : before
}

export type FlowAction =
  | { do: 'choose'; choice: DraftChoice }
  /** To a step the bar shows. */
  | { do: 'go'; step: StepId }
  /** On to the step after the one shown. */
  | { do: 'next' }

/** The flow after one thing the player does. A step that is not open is not gone to, and a step that still needs something is not gone on from. */
export function flowAfter(flow: Flow, action: FlowAction, entry: FlowEntry): Flow {
  if (!entry.invitation) return flow
  switch (action.do) {
    case 'choose':
      return { ...flow, draft: choose(flow.draft, action.choice, { pack: entry.pack, rules: entry.invitation.rules }) }
    case 'go':
      return stepStates(flow, entry)[action.step].open ? { ...flow, at: action.step } : flow
    case 'next': {
      const next = STEPS[placeOf(flow.at) + 1]
      if (!next || !stepStates(flow, entry)[flow.at].done) return flow
      return { ...flow, at: next, reached: placeOf(next) > placeOf(flow.reached) ? next : flow.reached }
    }
  }
}
