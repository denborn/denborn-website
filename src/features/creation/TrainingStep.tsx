import { useState } from 'react'
import type { DataPack, StatId } from '../../data/types'
import { TV_MAX, tvBudget, tvCeiling, tvOf, tvPlaced } from '../../game-rules/training'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { DexKey, DexPage, StepperBox, Tray } from '../../ui/dex'
import type { StepChrome } from './Creation'
import { BIG_STEP } from './big-step'
import { NaturePicker } from './NaturePicker'
import type { CreationDraft, DraftChoice } from './draft'

export interface TrainingStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  rules: CampaignRules
  draft: CreationDraft
  level: number
  onChoose: (choice: DraftChoice) => void
}

/** The stats in the order of their boxes (decision 292): HP, Attack, Defense; Speed, Special Attack, Special Defense. */
const STAT_ORDER: readonly StatId[] = ['hp', 'atk', 'def', 'spe', 'spa', 'spd']

/**
 * The nature over the TV (decisions 286, 292 and 306): the nature by the stat
 * it raises and the stat it lowers; under it one budget set by the level,
 * shared between the six stats in six boxes, which may wait. The two parts
 * stand where the identity's do: the nature where the name is, the TV where
 * the roleplay attributes are.
 */
export function TrainingStep({ pack, language, messages, chrome, rules, draft, level, onChoose }: TrainingStepProps) {
  const text = messages.creation
  const [about, setAbout] = useState(false)
  const tv = tvOf(draft)
  const budget = tvBudget(level)
  const placed = tvPlaced(draft)
  return (
    <>
      <DexPage
        title={text.training.title}
        steps={chrome.steps}
        covered={about}
        foot={
          <>
            <DexKey shape="square" aria-label={text.dex.about} onClick={() => setAbout(true)}>
              {text.dex.aboutKey}
            </DexKey>
            <p className={`dn-dex-count${placed >= budget ? ' dn-dex-count--spent' : ''}`} role="status" aria-label={text.training.tv(budget - placed, budget)}>
              {text.dex.count(placed, budget)}
            </p>
            {chrome.next}
          </>
        }
      >
        <div className="dn-dex-split">
          <NaturePicker pack={pack} language={language} messages={messages} rules={rules} nature={draft.nature} onChoose={(nature) => onChoose({ choose: 'nature', nature })} />
          {/* The six on one row, as the roleplay attributes are, to make room for MAX and MIN (decision 305). */}
          <div className="dn-dex-box-row">
          {STAT_ORDER.map((stat) => {
            const name = pack.statNames[stat][language]
            return (
              <StepperBox
                key={stat}
                short={text.dex.training.short[stat]}
                name={name}
                value={tv[stat]}
                min={0}
                max={TV_MAX}
                ceiling={tvCeiling(draft, stat, level)}
                onChange={(value) => onChoose({ choose: 'tv', stat, value })}
                raiseLabel={text.raise(name)}
                lowerLabel={text.lower(name)}
                ends={{ most: text.dex.most, least: text.dex.least }}
                bigStep={BIG_STEP === undefined ? undefined : { by: BIG_STEP, raiseLabel: text.raiseBy(name, BIG_STEP), lowerLabel: text.lowerBy(name, BIG_STEP) }}
              />
            )
          })}
          </div>
        </div>
      </DexPage>

      <Tray open={about} title={text.training.title} closeLabel={text.dex.close} onClose={() => setAbout(false)}>
        <p className="dn-tray__text">{rules.natures === 'chosen' ? text.dex.combat.aboutNature : text.identity.natureNeutral}</p>
        <p className="dn-tray__text">{text.dex.training.about}</p>
      </Tray>
    </>
  )
}
