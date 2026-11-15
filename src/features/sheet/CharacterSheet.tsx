import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { SheetNumbers } from '../../domain/sheet'
import { ATTRIBUTE_IDS } from '../../game-rules/attributes'
import { STAT_IDS } from '../../game-rules/stats'
import { useLanguage, useMessages } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CharacterDocument } from '../../shared/schema/character'
import {
  AgonyBadge,
  CategoryIcon,
  ExpBar,
  HudBox,
  ItemIconImage,
  OptionButton,
  PokemonSprite,
  QrCode,
  Screen,
  StatusBadge,
  StepHeader,
  Tabs,
  TypeLabel,
} from '../../ui'
import { type SheetView, characterLink, typeName } from './shown'

/** The parts of the sheet, in the order of their tabs. */
const PARTS = ['info', 'stats', 'moves', 'bag', 'share'] as const
type PartId = (typeof PARTS)[number]

/** The Agony stacks a downed Pokémon starts with (Agony rule 1): how many its badge counts out of. */
const AGONY_STACKS = 3

export interface CharacterSheetProps {
  pack: DataPack
  character: CharacterDocument
  /** Its stats and the other numbers worked out from it. */
  numbers: SheetNumbers
  /** The app's address, for the link its QR code holds. */
  origin: string
  /** Something to say above the sheet, such as a warning about other game data. */
  notice?: string | undefined
  onBack: () => void
  onSaveFile: () => void
  onPrint: () => void
}

/**
 * A character's sheet: the Pokémon and its HP on the top screen, and five
 * parts below: who it is, its stats, its moves, its bag, and the ways to copy
 * it elsewhere. It shows; it changes nothing.
 */
export function CharacterSheet({ pack, character, numbers, origin, notice, onBack, onSaveFile, onPrint }: CharacterSheetProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.sheet
  const [part, setPart] = useState<PartId>('info')
  const shown: SheetView = { pack, character, numbers, language, messages }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={character.nickname}>
          <Portrait {...shown} />
        </Screen>
      </div>
      <Screen kind="menu" label={character.nickname} tall>
        <StepHeader title={character.nickname} />
        <Tabs label={text.tabsLabel} tabs={PARTS.map((id) => ({ id, label: text.tabs[id] }))} current={part} onChange={setPart}>
          {notice && (
            <p className="dn-note dn-note--error" role="status">
              {notice}
            </p>
          )}
          {part === 'info' && <InfoPart {...shown} />}
          {part === 'stats' && <StatsPart {...shown} />}
          {part === 'moves' && <MovesPart {...shown} />}
          {part === 'bag' && <BagPart {...shown} />}
          {part === 'share' && <SharePart character={character} origin={origin} text={text} onSaveFile={onSaveFile} onPrint={onPrint} />}
        </Tabs>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}

/** The top screen: the Pokémon, its box with its HP and condition, and its types. */
function Portrait({ pack, character, numbers, language, messages }: SheetView) {
  const battle = messages.battle
  const species = pack.species[character.species]
  const condition = character.condition
  if (!species) return null
  return (
    <div className="dn-sheet-top">
      <PokemonSprite species={species} name={species.name[language]} female={character.gender === 'F'} frozen={condition.state !== 'standing'} decorative />
      <div className="dn-sheet-top__box">
        <HudBox
          side="player"
          name={character.nickname}
          level={character.level}
          gender={character.gender}
          hp={character.hp}
          maxHp={numbers.stats.hp}
          text={battle}
          showNumbers
          {...(condition.state === 'downed' ? { agony: { stacks: condition.stacks, text: battle.agony, label: battle.agonyLabel(condition.stacks, AGONY_STACKS) } } : {})}
        >
          {character.status && <StatusBadge status={character.status} text={battle.status[character.status].badge} label={battle.status[character.status].name} />}
        </HudBox>
        <span className="dn-sheet-top__types">
          {species.types.map((type) => (
            <TypeLabel key={type} type={type} text={typeName(pack, type, language)} />
          ))}
        </span>
        {condition.state === 'dead' && <span className="dn-status dn-sheet-top__dead">{messages.sheet.dead}</span>}
      </div>
    </div>
  )
}

/** Who it is: its species and campaign, its nature, what it holds, its Ability, its EXP and its six roleplay attributes. */
function InfoPart({ pack, character, numbers, language, messages }: SheetView) {
  const text = messages.sheet
  const nature = character.nature ? pack.natures[character.nature] : undefined
  const ability = pack.abilities[character.ability]
  const held = character.heldItem ? pack.items[character.heldItem] : undefined
  const condition = character.condition
  return (
    <>
      {condition.state === 'downed' && (
        <p className="dn-note dn-note--error">
          {text.downed(condition.stacks)} <AgonyBadge stacks={condition.stacks} text={messages.battle.agony} label={messages.battle.agonyLabel(condition.stacks, AGONY_STACKS)} />
        </p>
      )}
      <dl className="dn-facts">
        <dt>{text.species}</dt>
        <dd>{pack.species[character.species]?.name[language]}</dd>
        <dt>{text.campaign}</dt>
        <dd>{character.campaign.name}</dd>
        <dt>{text.nature}</dt>
        <dd>{nature ? nature.name[language] : text.neutral}</dd>
        <dt>{text.held}</dt>
        <dd>{held ? held.name[language] : text.nothing}</dd>
        <dt>{text.ability}</dt>
        <dd>{ability?.name[language]}</dd>
      </dl>
      {ability && <p className="dn-note">{ability.description[language]}</p>}

      <dl className="dn-facts">
        <dt>{text.exp}</dt>
        <dd>{character.exp}</dd>
      </dl>
      <ExpBar progress={numbers.exp.progress} label={text.expLabel(Math.round(numbers.exp.progress * 100))} />
      <p className="dn-note">{numbers.exp.next === undefined ? text.topLevel : text.nextLevel(numbers.exp.next)}</p>

      <span className="dn-label">{text.attributes}</span>
      <dl className="dn-facts">
        {ATTRIBUTE_IDS.flatMap((attribute) => [
          <dt key={`${attribute}-name`}>{messages.creation.attributes.names[attribute]}</dt>,
          <dd key={attribute}>{numbers.attributes[attribute]}</dd>,
        ])}
      </dl>
      {numbers.unplaced.attributes > 0 && <p className="dn-note">{text.unplaced(numbers.unplaced.attributes)}</p>}
    </>
  )
}

/** Its six stats, with the IVs and EVs behind each and the two its nature moves. */
function StatsPart({ pack, character, numbers, language, messages }: SheetView) {
  const text = messages.sheet
  const nature = character.nature ? pack.natures[character.nature] : undefined
  return (
    <>
      <table className="dn-figures">
        <thead>
          <tr>
            <th scope="col">{text.stat}</th>
            <th scope="col">{text.ivs}</th>
            <th scope="col">{text.evs}</th>
            <th scope="col">{text.value}</th>
          </tr>
        </thead>
        <tbody>
          {STAT_IDS.map((stat) => {
            const trend = nature?.plus === stat ? 'up' : nature?.minus === stat ? 'down' : undefined
            return (
              <tr key={stat} data-trend={trend}>
                <th scope="row">
                  {pack.statNames[stat][language]}
                  {trend && (
                    <span role="img" aria-label={trend === 'up' ? messages.creation.raised : messages.creation.lowered}>
                      {trend === 'up' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </th>
                <td>{character.ivs[stat]}</td>
                <td>{character.evs[stat]}</td>
                <td>{numbers.stats[stat]}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {numbers.unplaced.ivs > 0 && <p className="dn-note">{text.ivsLeft(numbers.unplaced.ivs)}</p>}
      {numbers.unplaced.evs > 0 && <p className="dn-note">{text.evsLeft(numbers.unplaced.evs)}</p>}
    </>
  )
}

/** Its moves, each with its type, category, PP, power, accuracy and what it does. */
function MovesPart({ pack, character, numbers, language, messages }: SheetView) {
  const text = messages.sheet
  return (
    <ul className="dn-list">
      {character.moves.map((slot) => {
        const move = pack.moves[slot.id]
        if (!move) return null
        return (
          <li key={slot.id} className="dn-slot">
            <span className="dn-slot__text">
              <span className="dn-slot__line">
                <span className="dn-slot__main dn-text-shadow">{move.name[language]}</span>
                <span className="dn-slot__side">
                  <TypeLabel type={move.type} text={typeName(pack, move.type, language)} />
                  <CategoryIcon category={move.category} label={messages.battle.category[move.category]} compact scale={0.8} />
                  <span className="dn-slot__pp">{text.pp(slot.pp, numbers.maxPp[slot.id] ?? slot.pp)}</span>
                </span>
              </span>
              <span className="dn-tags">
                {/* A move without a set power, or one that never misses, shows the games' three dashes. */}
                <span>
                  {text.power} {move.power > 0 ? move.power : text.noFigure}
                </span>
                <span>
                  {text.accuracy} {move.accuracy === true ? text.noFigure : move.accuracy}
                </span>
              </span>
              <span className="dn-note">{move.description[language]}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/** What it holds, its money and everything in its bag. */
function BagPart({ pack, character, language, messages }: SheetView) {
  const text = messages.sheet
  const held = character.heldItem ? pack.items[character.heldItem] : undefined
  return (
    <>
      <dl className="dn-facts">
        <dt>{text.held}</dt>
        <dd>{held ? held.name[language] : text.nothing}</dd>
        <dt>{text.moneyLabel}</dt>
        <dd>{text.money(character.money)}</dd>
      </dl>
      {character.bag.length === 0 && <p className="dn-note">{text.emptyBag}</p>}
      <ul className="dn-list">
        {character.bag.map((stack) => {
          const item = pack.items[stack.item]
          if (!item) return null
          return (
            <li key={stack.item} className="dn-slot">
              <span className="dn-slot__icon">
                <ItemIconImage icon={item.icon} />
              </span>
              <span className="dn-slot__text">
                <span className="dn-text-shadow">{text.stack(item.name[language], stack.quantity)}</span>
                <span className="dn-note">{item.description[language]}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}

interface SharePartProps {
  character: CharacterDocument
  origin: string
  text: Messages['sheet']
  onSaveFile: () => void
  onPrint: () => void
}

/** The ways to take the character elsewhere: its file, its sheet on paper, and its QR code. */
function SharePart({ character, origin, text, onSaveFile, onPrint }: SharePartProps) {
  return (
    <>
      <p className="dn-note">{text.file}</p>
      <div className="dn-row">
        <OptionButton primary onClick={onSaveFile}>
          {text.saveFile}
        </OptionButton>
      </div>
      <p className="dn-note">{text.printHint}</p>
      <div className="dn-row">
        <OptionButton onClick={onPrint}>{text.print}</OptionButton>
      </div>
      <p className="dn-note">{text.qr}</p>
      <QrCode text={characterLink(character, origin)} label={character.nickname} tooLong={text.tooLarge} />
    </>
  )
}
