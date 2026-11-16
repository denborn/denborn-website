import { type ReactNode, useState } from 'react'
import type { DataPack, ItemData } from '../../data/types'
import { maxHpOf } from '../../domain/character-check'
import { type ItemUse, isForOneMove, withItemUsed, worksOutsideFight } from '../../domain/items'
import { maxPp } from '../../game-rules/pp'
import { useLanguage, useMessages } from '../../i18n'
import type { SheetChange } from '../../shared/protocol/session'
import type { CharacterDocument } from '../../shared/schema/character'
import { ItemIconImage, NumberField, OptionButton, PokemonIcon, Slot } from '../../ui'
import { ViewFoot } from './ViewFoot'

/** Where the player is in the Bag: its list, with one item opened; or choosing who, which move or how many. */
type Step =
  | { at: 'list'; owner?: string; item?: string }
  | { at: 'target'; item: string; from?: string | undefined }
  | { at: 'move'; item: string; target: string; from?: string | undefined }
  | { at: 'take'; item: string; from: string; quantity: number }

export interface BagViewProps {
  pack: DataPack
  /** Everyone in the party, as their sheets stand. */
  characters: readonly CharacterDocument[]
  /** The player's own character. */
  mine: CharacterDocument
  /** Where the last request stands, said over the buttons; nothing when there is nothing to say. */
  notes: ReactNode
  /** True while nothing can be asked. */
  busy: boolean
  /** Asks a change; `said` is what to say once it is made. */
  onAsk: (change: SheetChange, said: string) => void
  onBack: () => void
}

/**
 * A character's Bag outside a fight (decisions 6, 12 and 175): an item is
 * used on anyone in the party, held, or put away; under it, the Bag of each
 * teammate who is downed or dead, to use from or to take from. Who an item
 * can be used on is what the rules say it would do something for.
 */
export function BagView({ pack, characters, mine, notes, busy, onAsk, onBack }: BagViewProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress.bag
  const sheet = messages.sheet
  const [step, setStep] = useState<Step>({ at: 'list' })
  const toList = (): void => setStep({ at: 'list' })
  /** Only a character on its feet uses items, takes them or changes what it holds. */
  const able = mine.condition.state === 'standing'
  const fallen = characters.filter((other) => other.id !== mine.id && other.condition.state !== 'standing')
  const held = mine.heldItem ? pack.items[mine.heldItem] : undefined
  /** Whether the rules would have the item do something: what a row that can be chosen stands for. */
  const works = (use: Omit<ItemUse, 'user'>): boolean => withItemUsed(characters, { user: mine.id, ...use }, pack).ok

  const use = (item: ItemData, from: string | undefined, target: CharacterDocument, move?: string): void => {
    const said = item.bag?.reviveAll ? text.usedForAll(mine.nickname, item.name[language]) : messages.battle.messages.bagUsed(mine.nickname, item.name[language], target.nickname)
    onAsk({ do: 'item', item: item.id, target: target.id, ...(move ? { move } : {}), ...(from ? { from } : {}) }, said)
    toList()
  }
  const take = (item: ItemData, owner: CharacterDocument, quantity: number): void => {
    onAsk({ do: 'take', from: owner.id, item: item.id, quantity }, text.took(mine.nickname, item.name[language], quantity, owner.nickname))
    toList()
  }

  /** The items of one Bag: the player's own, or a fallen teammate's. */
  const rows = (owner: CharacterDocument) =>
    owner.bag.map((stack) => {
      const item = pack.items[stack.item]
      if (!item) return null
      const theirs = owner.id !== mine.id
      const opened = step.at === 'list' && step.owner === owner.id && step.item === item.id
      const row = (
        <>
          <span className="dn-slot__icon">
            <ItemIconImage icon={item.icon} />
          </span>
          <span className="dn-slot__text">
            <span className="dn-text-shadow">{sheet.stack(item.name[language], stack.quantity)}</span>
            <span className="dn-note">{item.description[language]}</span>
          </span>
        </>
      )
      if (!able) {
        return (
          <div key={item.id} className="dn-slot">
            {row}
          </div>
        )
      }
      const usable = worksOutsideFight(item)
      return (
        <div key={item.id} className="dn-entry">
          <Slot selected={opened} aria-expanded={opened} onClick={() => setStep(opened ? { at: 'list' } : { at: 'list', owner: owner.id, item: item.id })}>
            {row}
          </Slot>
          {opened && (
            <div className="dn-row">
              {usable && (
                // An item for everyone who is down asks for nobody.
                <OptionButton primary disabled={busy} onClick={() => (item.bag?.reviveAll ? use(item, theirs ? owner.id : undefined, mine) : setStep({ at: 'target', item: item.id, from: theirs ? owner.id : undefined }))}>
                  {text.use}
                </OptionButton>
              )}
              {!theirs && item.holdable && (
                <OptionButton
                  disabled={busy}
                  onClick={() => {
                    onAsk({ do: 'hold', item: item.id }, text.holds(mine.nickname, item.name[language]))
                    toList()
                  }}
                >
                  {text.hold}
                </OptionButton>
              )}
              {theirs && (
                <OptionButton disabled={busy} onClick={() => (stack.quantity === 1 ? take(item, owner, 1) : setStep({ at: 'take', item: item.id, from: owner.id, quantity: stack.quantity }))}>
                  {text.take}
                </OptionButton>
              )}
            </div>
          )}
          {opened && !theirs && !usable && !item.holdable && <p className="dn-note">{text.nothingUsable}</p>}
        </div>
      )
    })

  const item = step.at === 'list' ? undefined : pack.items[step.item]
  const from = step.at === 'list' ? undefined : step.from
  const owner = from === undefined ? mine : characters.find((other) => other.id === from)
  /** How many of the item its Bag holds now: a step about an item that is gone goes back to the list. */
  const stock = item && owner ? (owner.bag.find((stack) => stack.item === item.id)?.quantity ?? 0) : 0

  let body: ReactNode
  let foot: ReactNode = <OptionButton onClick={toList}>{messages.nav.back}</OptionButton>
  if (step.at === 'list' || !item || !owner || stock === 0) {
    foot = <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
    body = (
      <>
        {!able && (
          <p className="dn-note dn-note--error" role="status">
            {text.cannot(mine.nickname)}
          </p>
        )}
        <dl className="dn-facts">
          <dt>{sheet.held}</dt>
          <dd>{held ? held.name[language] : sheet.nothing}</dd>
          <dt>{sheet.moneyLabel}</dt>
          <dd>{sheet.money(mine.money)}</dd>
        </dl>
        {able && held && (
          <div className="dn-row">
            <OptionButton disabled={busy} onClick={() => onAsk({ do: 'hold' }, text.holdsNothing(mine.nickname))}>
              {text.putAway}
            </OptionButton>
          </div>
        )}
        {mine.bag.length === 0 && <p className="dn-note">{sheet.emptyBag}</p>}
        {rows(mine)}
        {fallen.map((other) => (
          <div key={other.id} className="dn-entry" role="group" aria-label={messages.battle.choosing.bagOf(other.nickname)}>
            <span className="dn-label">{messages.battle.choosing.bagOf(other.nickname)}</span>
            <p className="dn-note">{text.fallen}</p>
            {other.bag.length === 0 && <p className="dn-note">{sheet.emptyBag}</p>}
            {rows(other)}
          </div>
        ))}
      </>
    )
  } else if (step.at === 'target') {
    const forMove = isForOneMove(item)
    body = (
      <>
        <span className="dn-label">{text.onWhom(item.name[language])}</span>
        {characters.map((target) => {
          const species = pack.species[target.species]
          const maxHp = maxHpOf(target, pack)
          const state = target.condition.state
          const can = forMove ? target.moves.some((slot) => works({ item: item.id, from, target: target.id, move: slot.id })) : works({ item: item.id, from, target: target.id })
          return (
            <Slot key={target.id} state={state === 'standing' ? 'normal' : 'down'} disabled={busy || !can} onClick={() => (forMove ? setStep({ at: 'move', item: item.id, target: target.id, from }) : use(item, from, target))}>
              {species && <PokemonIcon num={species.num} />}
              <span className="dn-slot__text">
                <span className="dn-text-shadow">
                  {target.nickname}
                  {target.id === mine.id && ` (${messages.session.join.you})`}
                </span>
                <span className="dn-note">
                  {state === 'dead' ? text.isDead : state === 'downed' ? text.isDown : text.hp(target.hp, maxHp ?? target.hp)}
                  {state === 'standing' && target.status && ` · ${messages.battle.status[target.status].name}`}
                </span>
              </span>
            </Slot>
          )
        })}
      </>
    )
  } else if (step.at === 'move') {
    const target = characters.find((other) => other.id === step.target)
    body = target && (
      <>
        <span className="dn-label">{text.whichMove(item.name[language], target.nickname)}</span>
        {target.moves.map((slot) => {
          const move = pack.moves[slot.id]
          if (!move) return null
          return (
            <Slot key={slot.id} disabled={busy || !works({ item: item.id, from, target: target.id, move: slot.id })} onClick={() => use(item, from, target, slot.id)}>
              <span className="dn-slot__text">
                <span className="dn-slot__line">
                  <span className="dn-slot__main dn-text-shadow">{move.name[language]}</span>
                  <span className="dn-slot__side">
                    <span className="dn-slot__pp">{sheet.pp(slot.pp, maxPp(move.pp, slot.ppUps, move.fixedPp))}</span>
                  </span>
                </span>
              </span>
            </Slot>
          )
        })}
      </>
    )
  } else {
    const quantity = Math.min(step.quantity, stock)
    body = (
      <>
        <span className="dn-label">{text.howMany(item.name[language])}</span>
        <NumberField
          label={item.name[language]}
          value={quantity}
          min={1}
          max={stock}
          onChange={(value) => setStep({ ...step, quantity: Math.min(stock, Math.max(1, value)) })}
          lowerLabel={messages.campaigns.fewer(item.name[language])}
          raiseLabel={messages.campaigns.oneMore(item.name[language])}
        />
      </>
    )
    foot = (
      <>
        <OptionButton onClick={toList}>{messages.nav.back}</OptionButton>
        <OptionButton primary disabled={busy} onClick={() => take(item, owner, quantity)}>
          {text.takeThem(quantity)}
        </OptionButton>
      </>
    )
  }

  return (
    <>
      <div className="dn-stack">{body}</div>
      <ViewFoot said={notes}>{foot}</ViewFoot>
    </>
  )
}
