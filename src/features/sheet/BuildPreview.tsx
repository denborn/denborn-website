import type { DataPack } from '../../data/types'
import { ATTRIBUTE_CAP, ATTRIBUTE_IDS } from '../../game-rules/attributes'
import { STAT_IDS, computeStats } from '../../game-rules/stats'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { PokemonSprite, StatRow, TypeLabel } from '../../ui'
import type { CreationDraft } from '../creation/draft'

/** What the facts beside the Pokémon are: its species' base stats, its roleplay attributes, or its stats at its level. */
export type BuildView = 'base' | 'attributes' | 'stats'

export interface BuildPreviewProps {
  pack: DataPack
  draft: CreationDraft
  level: number
  view: BuildView
  language: Language
  text: Messages['creation']
  levelText: string
}

/** The highest base stat there is, for the bars. */
const BASE_STAT_MAX = 255

/**
 * A Pokémon as it is being built, on a top screen: an enemy in its editor, a
 * character whose points are being placed. Redrawn at every choice, with the
 * numbers the screen below is about. (A character being created has the
 * Pokédex's own top screen, decision 288.)
 */
export function BuildPreview({ pack, draft, level, view, language, text, levelText }: BuildPreviewProps) {
  const species = draft.species ? pack.species[draft.species] : undefined
  if (!species) {
    return (
      <div className="dn-preview dn-preview--empty">
        <p className="dn-note dn-text-outline">{text.previewEmpty}</p>
      </div>
    )
  }
  const nature = draft.nature ? pack.natures[draft.nature] : undefined
  const ability = draft.ability ? pack.abilities[draft.ability] : undefined
  const name = draft.nickname.trim() || species.name[language]
  const stats = computeStats({ baseStats: species.baseStats, ivs: draft.ivs, evs: draft.evs, level, nature: nature ?? {} })
  // A bar's end: the largest of the six, so the bars compare the stats with one another.
  const statMax = Math.max(...STAT_IDS.map((stat) => stats[stat]))
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
        {view === 'attributes' ? (
          <>
            <span className="dn-label">{text.attributes.title}</span>
            {ATTRIBUTE_IDS.map((attribute) => (
              <StatRow key={attribute} name={text.attributes.names[attribute]} value={draft.attributes[attribute]} max={ATTRIBUTE_CAP} />
            ))}
          </>
        ) : (
          <>
            <span className="dn-label">{view === 'base' ? text.baseStats : text.training.statsAt(level)}</span>
            {STAT_IDS.map((stat) => {
              const trend = nature?.plus === stat ? 'up' : nature?.minus === stat ? 'down' : undefined
              return (
                <StatRow
                  key={stat}
                  name={pack.statNames[stat][language]}
                  value={view === 'base' ? species.baseStats[stat] : stats[stat]}
                  max={view === 'base' ? BASE_STAT_MAX : statMax}
                  {...(trend ? { trend, trendLabel: trend === 'up' ? text.raised : text.lowered } : {})}
                />
              )
            })}
          </>
        )}
        {ability && <span className="dn-preview__ability">{ability.name[language]}</span>}
      </div>
    </div>
  )
}
