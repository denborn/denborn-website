import { useState } from 'react'
import type { DataPack, StatId } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CampaignRules } from '../../shared/schema/rules'
import { NATURE_STATS, natureFor, statsOf } from './nature-pick'

export interface NaturePickerProps {
  pack: DataPack
  language: Language
  messages: Messages
  rules: CampaignRules
  /** The nature chosen so far. */
  nature: string | undefined
  onChoose: (nature: string) => void
}

/**
 * The nature, by the stat it raises on one row and the stat it lowers on the
 * next (decision 291), on the screen of TV since decision 306. Its name is on
 * the top screen; here it is said, for whoever does not see it. Where every
 * Pokémon is neutral, it says so instead.
 */
export function NaturePicker({ pack, language, messages, rules, nature, onChoose }: NaturePickerProps) {
  const words = messages.creation.identity
  const short = messages.creation.dex.training.short
  // The stat raised and the stat lowered, as far as they are picked: one alone names no nature yet.
  const [picked, setPicked] = useState<{ raised?: StatId; lowered?: StatId }>(() => statsOf(pack.natures, nature) ?? {})
  if (rules.natures !== 'chosen') return <p className="dn-dex-nature__name dn-dex-nature__name--alone">{words.natureNeutral}</p>

  const named = nature ? pack.natures[nature] : undefined
  const pick = (part: 'raised' | 'lowered', stat: StatId): void => {
    const next = { ...picked, [part]: stat }
    setPicked(next)
    const found = next.raised && next.lowered ? natureFor(pack.natures, next.raised, next.lowered) : undefined
    if (found) onChoose(found)
  }
  const said = !named
    ? messages.creation.dex.combat.natureUnset
    : named.plus && named.minus && named.plus !== named.minus
      ? words.natureLabel(named.name[language], pack.statNames[named.plus][language], pack.statNames[named.minus][language])
      : words.natureLabelNeutral(named.name[language])

  return (
    <div className="dn-dex-nature">
      {(['raised', 'lowered'] as const).map((part) => (
        <div key={part} className={`dn-dex-nature__row dn-dex-nature__row--${part}`} role="group" aria-label={part === 'raised' ? words.raises : words.lowers}>
          <span className="dn-dex-nature__way" aria-hidden="true">
            <span className={`dn-trend dn-trend--${part === 'raised' ? 'up' : 'down'}`} />
          </span>
          {NATURE_STATS.map((stat) => (
            // Named by its letters, then by the stat's whole name for whoever cannot see what they stand for.
            <button key={stat} type="button" className="dn-dex-chip" aria-pressed={picked[part] === stat} onClick={() => pick(part, stat)}>
              {short[stat]}
              <span className="dn-visually-hidden"> ({pack.statNames[stat][language]})</span>
            </button>
          ))}
        </div>
      ))}
      <p className="dn-visually-hidden" role="status">
        {said}
      </p>
    </div>
  )
}
