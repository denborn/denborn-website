import type { CSSProperties } from 'react'
import type { DataPack } from '../../data/types'
import { STAT_IDS } from '../../game-rules/stats'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { HudBox, ItemIconImage, OptionButton, StatusBadge, type StatusId, TypeLabel } from '../../ui'
import type { Fighter } from './fighters'

export interface FighterSheetProps {
  pack: DataPack
  fighter: Fighter
  language: Language
  messages: Messages
  onBack: () => void
}

const signed = (stages: number): string => (stages > 0 ? `+${stages}` : `${stages}`)
const STATUSES: readonly string[] = ['psn', 'tox', 'brn', 'par', 'slp', 'frz']
export const statusOf = (status: string): StatusId | undefined => (STATUSES.includes(status) ? (status as StatusId) : undefined)

/**
 * A Pokémon's sheet during a fight, on the touch screen (decision 88): its
 * box with its HP in numbers, its types, its stats with the stages they
 * carry, its Ability, what it holds and its moves with their PP. Players see
 * all of it of an enemy too (decision 17).
 */
export function FighterSheet({ pack, fighter, language, messages, onBack }: FighterSheetProps) {
  const battle = messages.battle
  const text = battle.choosing
  const { now, species } = fighter
  const item = now.item ? pack.items[now.item] : undefined
  const status = statusOf(now.status)
  return (
    <div className="dn-card">
      <div className="dn-card__head">
        <HudBox
          side="player"
          name={fighter.name}
          level={fighter.level}
          gender={fighter.gender}
          hp={now.hp}
          maxHp={now.maxHp}
          text={battle}
          showNumbers
          {...(fighter.changed ? { changed: battle.field.changed } : {})}
          {...(fighter.state === 'downed' ? { agony: { stacks: now.stacks, text: battle.agony, label: battle.agonyLabel(now.stacks, 3) } } : {})}
        >
          {status && <StatusBadge status={status} text={battle.status[status].badge} label={battle.status[status].name} />}
        </HudBox>
        <span className="dn-card__types">
          {(species?.types ?? []).map((type) => (
            <TypeLabel key={type} type={type} text={pack.types[type.toLowerCase()]?.name[language] ?? type} />
          ))}
        </span>
      </div>
      <dl className="dn-card__stats">
        {STAT_IDS.filter((stat) => stat !== 'hp').map((stat) => (
          <div key={stat}>
            <dt>{pack.statNames[stat][language]}</dt>
            <dd>
              {fighter.stats?.[stat] ?? text.nothing}
              {now.boosts[stat] !== undefined && <span className="dn-card__stage"> {signed(now.boosts[stat])}</span>}
            </dd>
          </div>
        ))}
        <div className="dn-card__wide">
          <dt>{battle.field.ability}</dt>
          <dd>{pack.abilities[now.ability]?.name[language] ?? text.nothing}</dd>
        </div>
        <div className="dn-card__wide">
          <dt>{battle.field.item}</dt>
          <dd>
            {item ? (
              <>
                <ItemIconImage icon={item.icon} scale={0.5} /> {item.name[language]}
              </>
            ) : (
              text.nothing
            )}
          </dd>
        </div>
      </dl>
      <ul className="dn-card__moves">
        {now.moves.map((slot) => {
          const move = pack.moves[slot.id]
          const type = (move?.type ?? 'Normal').toLowerCase()
          const style = { '--dn-type-fill': `var(--dn-type-${type})`, '--dn-type-shade': `var(--dn-type-${type}-shade)` } as CSSProperties
          return (
            <li key={slot.id} style={style}>
              <span>{move?.name[language] ?? slot.id}</span>
              <span>{text.sheetPp(slot.pp, slot.maxPp)}</span>
            </li>
          )
        })}
      </ul>
      <span className="dn-card__back">
        <OptionButton onClick={onBack}>{battle.back}</OptionButton>
      </span>
    </div>
  )
}
