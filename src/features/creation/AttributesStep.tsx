import { ATTRIBUTE_CAP, ATTRIBUTE_IDS, CREATION_MIN, attributeTally, gainedPoints } from '../../game-rules/attributes'
import type { Messages } from '../../i18n/en'
import { NumberField } from '../../ui'
import { type CreationDraft, type DraftChoice, attributeCeiling } from './draft'

export interface AttributesStepProps {
  draft: CreationDraft
  level: number
  text: Messages['creation']
  onChoose: (choice: DraftChoice) => void
}

/** The six roleplay attributes: 300 points to share, and the extra points of a character that starts above level 1. */
export function AttributesStep({ draft, level, text, onChoose }: AttributesStepProps) {
  const tally = attributeTally(draft.attributes, level)
  const extra = gainedPoints(level)
  return (
    <div className="dn-stack">
      <p className="dn-note">{text.attributes.intro}</p>
      {/* Said again when it changes, without taking focus from the number being set. */}
      <p className={`dn-note${tally.toPlace > 0 ? ' dn-note--error' : ''}`} role="status">
        {tally.toPlace > 0 ? text.attributes.toPlace(tally.toPlace) : text.attributes.placed}
      </p>
      {extra > 0 && <p className="dn-note">{text.attributes.extra(Math.max(0, tally.extraLeft), extra)}</p>}
      {ATTRIBUTE_IDS.map((attribute) => {
        const name = text.attributes.names[attribute]
        return (
          <NumberField
            key={attribute}
            label={name}
            value={draft.attributes[attribute]}
            min={CREATION_MIN}
            max={ATTRIBUTE_CAP}
            ceiling={attributeCeiling(draft.attributes, attribute, level)}
            onChange={(value) => onChoose({ choose: 'attribute', attribute, value })}
            lowerLabel={text.lower(name)}
            raiseLabel={text.raise(name)}
          />
        )
      })}
    </div>
  )
}
