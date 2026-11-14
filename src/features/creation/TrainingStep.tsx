import type { DataPack } from '../../data/types'
import { EV_MAX, IV_MAX, evBudget, ivBudget, spreadTotal } from '../../game-rules/budgets'
import { STAT_IDS } from '../../game-rules/stats'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { NumberField } from '../../ui'
import { type CreationDraft, type DraftChoice, spreadCeiling } from './draft'

export interface TrainingStepProps {
  pack: DataPack
  draft: CreationDraft
  level: number
  language: Language
  text: Messages['creation']
  onChoose: (choice: DraftChoice) => void
}

/** IVs and EVs: two budgets set by the level, each shared between the six stats. Points may wait. */
export function TrainingStep({ pack, draft, level, language, text, onChoose }: TrainingStepProps) {
  const ivs = ivBudget(level)
  const evs = evBudget(level)
  return (
    <div className="dn-stack">
      <p className="dn-note">{text.training.intro}</p>
      <div role="group" aria-label={text.training.ivs(ivs - spreadTotal(draft.ivs), ivs)} className="dn-entry">
        <span className="dn-label" role="status">
          {text.training.ivs(ivs - spreadTotal(draft.ivs), ivs)}
        </span>
        {STAT_IDS.map((stat) => {
          const name = pack.statNames[stat][language]
          return (
            <NumberField
              key={stat}
              label={name}
              value={draft.ivs[stat]}
              min={0}
              max={IV_MAX}
              ceiling={spreadCeiling(draft.ivs, stat, IV_MAX, ivs)}
              onChange={(value) => onChoose({ choose: 'iv', stat, value })}
              lowerLabel={text.lower(name)}
              raiseLabel={text.raise(name)}
            />
          )
        })}
      </div>
      <div role="group" aria-label={text.training.evs(evs - spreadTotal(draft.evs), evs)} className="dn-entry">
        <span className="dn-label" role="status">
          {text.training.evs(evs - spreadTotal(draft.evs), evs)}
        </span>
        {STAT_IDS.map((stat) => {
          const name = pack.statNames[stat][language]
          return (
            <NumberField
              key={stat}
              label={name}
              value={draft.evs[stat]}
              min={0}
              max={EV_MAX}
              ceiling={spreadCeiling(draft.evs, stat, EV_MAX, evs)}
              onChange={(value) => onChoose({ choose: 'ev', stat, value })}
              lowerLabel={text.lower(name)}
              raiseLabel={text.raise(name)}
            />
          )
        })}
      </div>
    </div>
  )
}
