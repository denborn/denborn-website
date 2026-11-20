import { type ReactNode, useId, useState } from 'react'
import { STEP_ICONS, itemSheetIcon } from '../../data/sprites'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { Invitation } from '../../shared/codec/codes'
import type { CharacterDocument } from '../../shared/schema/character'
import { DualScreen, ItemIconImage, Screen } from '../../ui'
import { DexKey, StepBar } from '../../ui/dex'
import type { CameraProps } from '../scan/camera'
import { CampaignStep } from './CampaignStep'
import { CombatStep } from './CombatStep'
import { IdentityStep } from './IdentityStep'
import { ItemsStep } from './ItemsStep'
import { MovesStep } from './MovesStep'
import { RecapScreen } from './RecapScreen'
import { ReviewStep } from './ReviewStep'
import { SpeciesStep } from './SpeciesStep'
import { TrainingStep } from './TrainingStep'
import type { CampaignLinkProblem, CampaignLinkRead } from './campaign-link'
import { type DraftChoice, type StepId, toCharacter } from './draft'
import { FLOW_STEPS, type Flow, type FlowAction, type FlowEntry, type FlowStep, NEW_FLOW, flowAfter, flowFor, stepBefore, stepStates } from './flow'
import { recapOf } from './recap'

/** The name of the Pokédex's top screen: the same screen for the whole of a creation, whatever the address. */
export const DEX = 'pokedex'

export interface CreationProps {
  pack: DataPack
  /** The campaigns this device can create for. */
  invitations: readonly Invitation[]
  /** The campaign in the address; nothing while one is being chosen. */
  campaignId: string | undefined
  /** Creation was started for this one campaign, from a session: there is no other to choose. */
  campaignLocked: boolean
  /** Something to say on arrival, when a link opened from outside could not be read. */
  arrivedWith?: CampaignLinkProblem | undefined
  /** Gives the new character its id. */
  newId: () => string
  /** Draws the camera's picture and reads the QR codes in it. Left out where there is no way to scan. */
  camera?: ((props: CameraProps) => ReactNode) | undefined
  /** Reads a pasted or scanned text, and keeps the campaign it names on this device. */
  onLink: (text: string) => CampaignLinkRead
  /** Goes to a campaign's steps, or back to choosing one. */
  onCampaign: (campaignId: string | undefined) => void
  /** Leaves the Pokédex to make a new campaign, to come back with it (decision 299). */
  onNewCampaign: () => void
  /** Leaves the Pokédex. */
  onLeave: () => void
  /** Receives the character once it is made and has passed every rule of creation. */
  onCreate: (character: CharacterDocument) => void
}

/** What every step has in common: the bar of steps across its top, and the way on, as a key and as what the key does. */
export interface StepChrome {
  steps: ReactNode
  next: ReactNode
  onNext: () => void
}

/**
 * Creating a character, in a Pokédex (decisions 287 to 309). The top screen is
 * the character as far as it is made, and stays from the first step to the
 * last; the bottom one is a step: the campaign, then the seven of decision
 * 101. The bar across its top shows them all and goes to any that is open.
 * Nothing chosen is lost by going back, or by choosing the same campaign
 * again.
 */
export function Creation({ pack, invitations, campaignId, campaignLocked, arrivedWith, newId, camera, onLink, onCampaign, onNewCampaign, onLeave, onCreate }: CreationProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.creation
  const own = useId()
  const [kept, setFlow] = useState<Flow>(NEW_FLOW)
  // Another campaign in the address starts a draft over; the same one, or none, finds it as it was.
  const flow = flowFor(kept, campaignId)
  const invitation = invitations.find((one) => one.campaign.id === (campaignId ?? flow.campaign))
  const entry: FlowEntry = { invitation, pack, campaignLocked }
  const states = stepStates(flow, entry)
  // The steps after the campaign's need a campaign this device has: an address that names another shows the campaigns.
  const step: FlowStep = campaignId !== undefined && invitation ? flow.at : 'campaign'

  const act = (action: FlowAction): void => setFlow((was) => flowAfter(flowFor(was, campaignId), action, entry))
  const choose = (choice: DraftChoice): void => act({ do: 'choose', choice })
  const goTo = (to: FlowStep): void => {
    if (to === 'campaign') {
      // The campaign of the address is kept, chosen or not: back at the campaigns it is lit, and the top screen still shows it.
      setFlow((was) => flowFor(was, campaignId))
      onCampaign(undefined)
      return
    }
    act({ do: 'go', step: to })
    // From the campaign's step, the others are those of the campaign the draft was made for.
    if (campaignId === undefined && flow.campaign !== undefined) onCampaign(flow.campaign)
  }

  const names = text.dex.stepNames
  const before = stepBefore(step, campaignLocked)
  const chrome: StepChrome = {
    steps: (
      <StepBar
        label={text.dex.steps}
        current={step}
        onStep={goTo}
        // The arrow goes back a step at a time, and leaves the Pokédex from the first (decision 300).
        back={before ? { label: text.dex.previous, onBack: () => goTo(before) } : { label: text.dex.leave, onBack: onLeave }}
        // A lamp is lit for a step the player has been to: one further on may have what it needs already, and says nothing of it yet.
        steps={FLOW_STEPS.map((id) => ({ id, name: names[id], icon: <ItemIconImage icon={itemSheetIcon(STEP_ICONS[id])} scale={0.75} />, done: states[id].done && (states[id].open || id === 'campaign'), open: states[id].open }))}
      />
    ),
    next: (
      <span className="dn-dex-foot__end">
        <DexKey shape="go" disabled={step === 'campaign' || !states[step].done} onClick={() => act({ do: 'next' })}>
          {text.next}
        </DexKey>
      </span>
    ),
    onNext: () => act({ do: 'next' }),
  }

  const create = (): void => {
    const character = invitation && toCharacter(flow.draft, invitation, pack, newId())
    if (character) onCreate(character)
  }

  const shared = { pack, language, messages, chrome }
  const context = invitation && { pack, rules: invitation.rules }
  const body: Record<StepId, () => ReactNode> = {
    species: () => context && <SpeciesStep {...shared} rules={context.rules} draft={flow.draft} onChoose={(species) => choose({ choose: 'species', species })} />,
    identity: () => context && <IdentityStep {...shared} rules={context.rules} draft={flow.draft} onChoose={choose} />,
    combat: () => context && <CombatStep {...shared} draft={flow.draft} onChoose={choose} />,
    training: () => context && <TrainingStep {...shared} rules={context.rules} draft={flow.draft} level={context.rules.startingLevel} onChoose={choose} />,
    moves: () => context && <MovesStep {...shared} context={context} draft={flow.draft} onChoose={choose} />,
    items: () => context && <ItemsStep {...shared} rules={context.rules} draft={flow.draft} onChoose={choose} />,
    review: () => context && <ReviewStep {...shared} rules={context.rules} draft={flow.draft} ready={states.review.done} onCreate={create} />,
  }

  return (
    <DualScreen depth={FLOW_STEPS.indexOf(step)}>
      <Screen key={DEX} kind="dex" label={text.preview}>
        <RecapScreen pack={pack} recap={recapOf(flow, invitation, pack)} language={language} messages={messages} />
      </Screen>
      {/* Each step is a screen of its own under the same top screen: its pieces fly out and the next step's fly in. */}
      <Screen key={`${own} ${step}`} kind="dex" label={names[step]}>
        {step === 'campaign' ? (
          <CampaignStep
            messages={messages}
            chrome={chrome}
            invitations={invitations}
            chosen={campaignId ?? flow.campaign}
            unknown={campaignId !== undefined && !invitation}
            arrivedWith={arrivedWith}
            camera={camera}
            onLink={onLink}
            onCreate={(id) => onCampaign(id)}
            onNewCampaign={onNewCampaign}
          />
        ) : (
          body[step]()
        )}
      </Screen>
    </DualScreen>
  )
}
