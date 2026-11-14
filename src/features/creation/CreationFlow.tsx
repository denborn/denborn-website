import { useEffect, useReducer, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { Invitation } from '../../shared/codec/codes'
import { OptionButton, Screen, StepHeader } from '../../ui'
import { IdentityStep } from './IdentityStep'
import { Preview } from './Preview'
import { SpeciesStep } from './SpeciesStep'
import { type CreationDraft, type DraftChoice, choose, emptyDraft, identityProblems, speciesProblem } from './draft'

export interface CreationFlowProps {
  /** The campaign to create for, as its creation link gave it. */
  invitation: Invitation
  pack: DataPack
  /** Leaves the flow from its first step. */
  onLeave: () => void
}

const STEPS = ['species', 'identity'] as const

/**
 * Creating a character: the Pokémon on the top screen, one step at a time on
 * the screen below. A step lets the player go on only when it has what it
 * needs, and says what is missing.
 */
export function CreationFlow({ invitation, pack, onLeave }: CreationFlowProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.creation
  const rules = invitation.rules
  const [draft, send] = useReducer((current: CreationDraft, choice: DraftChoice) => choose(current, choice, pack), emptyDraft)
  const [at, setAt] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const step = STEPS[at] ?? 'species'

  // On a new step, focus goes to its title: a keyboard starts from the top, a screen reader says where it is.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else heading.current?.focus()
  }, [at])

  const identity = identityProblems(draft, rules, pack)
  const ready = step === 'species' ? speciesProblem(draft, rules) === undefined : Object.keys(identity).length === 0
  const title = step === 'species' ? text.species.title : text.identity.title

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.preview}>
          <Preview pack={pack} draft={draft} level={rules.startingLevel} language={language} text={text} levelText={messages.battle.level} />
        </Screen>
      </div>
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={title} count={text.step(at + 1, STEPS.length)} headingRef={heading} />
        {step === 'species' && <SpeciesStep pack={pack} rules={rules} draft={draft} language={language} text={text.species} onChoose={(species) => send({ choose: 'species', species })} />}
        {step === 'identity' && <IdentityStep pack={pack} rules={rules} draft={draft} problems={identity} language={language} text={text.identity} onChoose={send} />}
        <div className="dn-foot">
          <OptionButton onClick={() => (at === 0 ? onLeave() : setAt(at - 1))}>{text.back}</OptionButton>
          <OptionButton primary disabled={!ready || at === STEPS.length - 1} onClick={() => setAt(at + 1)}>
            {text.next}
          </OptionButton>
        </div>
      </Screen>
    </div>
  )
}
