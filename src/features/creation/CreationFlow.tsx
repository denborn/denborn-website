import { useId, useReducer, useState } from 'react'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { Invitation } from '../../shared/codec/codes'
import type { CharacterDocument } from '../../shared/schema/character'
import { DualScreen, OptionButton, Screen, StepHeader } from '../../ui'
import { AttributesStep } from './AttributesStep'
import { IdentityStep } from './IdentityStep'
import { ItemsStep } from './ItemsStep'
import { MovesStep } from './MovesStep'
import { Preview, type PreviewView } from './Preview'
import { ReviewStep } from './ReviewStep'
import { SpeciesStep } from './SpeciesStep'
import { TrainingStep } from './TrainingStep'
import { type CreationDraft, type DraftChoice, STEPS, type StepId, choose, creationProblems, emptyDraft, identityProblems, isStepDone, toCharacter } from './draft'

export interface CreationFlowProps {
  /** The campaign to create for, as its creation link gave it. */
  invitation: Invitation
  pack: DataPack
  /** Gives the new character its id. */
  newId: () => string
  /** Leaves the flow from its first step. */
  onLeave: () => void
  /** Receives the character once it is made and has passed every rule of creation. */
  onCreate: (character: CharacterDocument) => void
}

/** What the top screen shows beside the Pokémon at each step. */
const VIEW: Record<StepId, PreviewView> = { species: 'base', identity: 'base', attributes: 'attributes', training: 'stats', moves: 'stats', items: 'stats', review: 'stats' }

/**
 * Creating a character: the Pokémon on the top screen, one step at a time on
 * the screen below. A step lets the player go on only when it has what it
 * needs, and says what is missing. BACK loses nothing.
 */
export function CreationFlow({ invitation, pack, newId, onLeave, onCreate }: CreationFlowProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.creation
  const rules = invitation.rules
  const context = { pack, rules }
  const [draft, send] = useReducer((current: CreationDraft, choice: DraftChoice) => choose(current, choice, { pack, rules }), emptyDraft)
  const [at, setAt] = useState(0)
  const own = useId()
  const step = STEPS[at] ?? 'species'
  const last = at === STEPS.length - 1

  const titles: Record<StepId, string> = {
    species: text.species.title,
    identity: text.identity.title,
    attributes: text.attributes.title,
    training: text.training.title,
    moves: text.moves.title,
    items: text.items.title,
    review: text.review.title,
  }
  const problems = last ? creationProblems(draft, invitation, pack) : undefined
  const ready = last ? problems?.length === 0 : isStepDone(step, draft, context)

  const create = (): void => {
    const character = toCharacter(draft, invitation, pack, newId())
    if (character) onCreate(character)
  }

  return (
    <DualScreen depth={at}>
      <Screen kind="scene" label={text.preview}>
        <Preview pack={pack} draft={draft} level={rules.startingLevel} view={VIEW[step]} language={language} text={text} levelText={messages.battle.level} />
      </Screen>
      {/* Each step is a screen of its own under the same preview: it fades in from its top, and its title takes the focus. */}
      <Screen key={`${own} ${step}`} kind="menu" label={text.title} scrolls>
        <StepHeader title={titles[step]} count={text.step(at + 1, STEPS.length)} />
        {step === 'species' && <SpeciesStep pack={pack} rules={rules} draft={draft} language={language} text={text.species} onChoose={(species) => send({ choose: 'species', species })} />}
        {step === 'identity' && <IdentityStep pack={pack} rules={rules} draft={draft} problems={identityProblems(draft, context)} language={language} text={text.identity} onChoose={send} />}
        {step === 'attributes' && <AttributesStep draft={draft} level={rules.startingLevel} text={text} onChoose={send} />}
        {step === 'training' && <TrainingStep pack={pack} draft={draft} level={rules.startingLevel} language={language} text={text} onChoose={send} />}
        {step === 'moves' && (
          <MovesStep pack={pack} context={context} draft={draft} language={language} text={text} categoryText={messages.battle.category} onToggle={(move) => send({ choose: 'move', move })} />
        )}
        {step === 'items' && <ItemsStep pack={pack} rules={rules} draft={draft} language={language} text={text.items} onChoose={send} />}
        {step === 'review' && <ReviewStep pack={pack} rules={rules} draft={draft} problems={problems} language={language} text={text} />}
        <div className="dn-foot">
          <OptionButton onClick={() => (at === 0 ? onLeave() : setAt(at - 1))}>{text.back}</OptionButton>
          <OptionButton primary disabled={!ready} onClick={() => (last ? create() : setAt(at + 1))}>
            {last ? text.review.create : text.next}
          </OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
