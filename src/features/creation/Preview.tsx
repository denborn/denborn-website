import type { DataPack } from '../../data/types'
import { STAT_IDS } from '../../game-rules/stats'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { PokemonSprite, StatRow, TypeLabel } from '../../ui'
import type { CreationDraft } from './draft'

export interface PreviewProps {
  pack: DataPack
  draft: CreationDraft
  level: number
  language: Language
  text: Messages['creation']
  levelText: string
}

/** The highest base stat there is, for the bars. */
const BASE_STAT_MAX = 255

/**
 * The top screen of character creation: the Pokémon as it stands, redrawn at
 * every choice. Its stats are the species' base stats, with the nature's
 * effect pointed out.
 */
export function Preview({ pack, draft, level, language, text, levelText }: PreviewProps) {
  const species = draft.species ? pack.species[draft.species] : undefined
  if (!species) {
    return (
      <div className="dn-preview dn-preview--empty">
        <p className="dn-note">{text.previewEmpty}</p>
      </div>
    )
  }
  const nature = draft.nature ? pack.natures[draft.nature] : undefined
  const ability = draft.ability ? pack.abilities[draft.ability] : undefined
  const name = draft.nickname.trim() || species.name[language]
  return (
    <div className="dn-preview">
      <div className="dn-preview__who">
        <PokemonSprite species={species} name={species.name[language]} female={draft.gender === 'F'} decorative />
        <span className="dn-preview__name dn-text-outline">{name}</span>
        <span className="dn-preview__level dn-text-outline">
          <span className="dn-hud__label">{levelText}</span>
          {level}
        </span>
      </div>
      <div className="dn-preview__facts">
        <div className="dn-preview__types">
          <span className="dn-preview__species">{species.name[language]}</span>
          {species.types.map((type) => (
            <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[language] ?? type} />
          ))}
        </div>
        <span className="dn-label">{text.baseStats}</span>
        {STAT_IDS.map((stat) => {
          const trend = nature?.plus === stat ? 'up' : nature?.minus === stat ? 'down' : undefined
          return (
            <StatRow
              key={stat}
              name={pack.statNames[stat][language]}
              value={species.baseStats[stat]}
              max={BASE_STAT_MAX}
              {...(trend ? { trend, trendLabel: trend === 'up' ? text.raised : text.lowered } : {})}
            />
          )
        })}
        {ability && <span className="dn-preview__ability">{ability.name[language]}</span>}
      </div>
    </div>
  )
}
