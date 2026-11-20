import type { DataPack } from '../../data/types'
import { STAT_IDS } from '../../game-rules/stats'
import { TV_MAX, tvBudget, tvCeiling, tvLeft, tvOf } from '../../game-rules/training'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { NumberField } from '../../ui'
import type { CreationDraft, DraftChoice } from '../creation/draft'

export interface EnemyTrainingProps {
  pack: DataPack
  draft: CreationDraft
  level: number
  language: Language
  text: Messages['creation']
  onChoose: (choice: DraftChoice) => void
}

/** An enemy's TV: one budget set by its level, shared between the six stats (decision 286). It may wait. */
export function EnemyTraining({ pack, draft, level, language, text, onChoose }: EnemyTrainingProps) {
  const tv = tvOf(draft)
  const left = text.training.tv(tvLeft(draft, level), tvBudget(level))
  return (
    <div className="dn-stack">
      <p className="dn-note">{text.training.intro}</p>
      <div role="group" aria-label={left} className="dn-entry">
        <span className="dn-label" role="status">
          {left}
        </span>
        {STAT_IDS.map((stat) => {
          const name = pack.statNames[stat][language]
          return (
            <NumberField
              key={stat}
              label={name}
              value={tv[stat]}
              min={0}
              max={TV_MAX}
              ceiling={tvCeiling(draft, stat, level)}
              onChange={(value) => onChoose({ choose: 'tv', stat, value })}
              lowerLabel={text.lower(name)}
              raiseLabel={text.raise(name)}
            />
          )
        })}
      </div>
    </div>
  )
}
