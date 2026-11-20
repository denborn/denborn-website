import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { ArrowButton, CategoryIcon, TypeLabel } from '../../ui'
import { DexKey, type WheelSize } from '../../ui/dex'
import { type About, FilterWheel } from './FilterWheel'
import { movesListed, typesOffered } from './move-list'

/** The wheel of moves: shorter than a tray's own, under the bar that narrows it (decision 302). */
const MOVES_WHEEL: WheelSize = { height: 94, row: 24 }

/** How the wheel is narrowed: by a type, or by a part of a name. */
type MoveLook = { by: 'type'; type: string | undefined } | { by: 'name'; name: string }

export interface MovePickerProps {
  pack: DataPack
  language: Language
  messages: Messages
  /** What the wheel is, for assistive technology. */
  label: string
  /** The moves to choose from, by their ids. */
  moves: readonly string[]
  /** The move the wheel opens on. */
  start: string | undefined
  /** Whether a move's lamp is lit: one the Pokémon has, one the filter keeps. */
  isMarked: (id: string) => boolean
  /** Whether a move is known already, in another of the Pokémon's places: said beside its figures. */
  isKnown?: (id: string) => boolean
  still: boolean
  /** What a press on the row in the middle does. */
  onPress: (id: string) => void
  /** The keys beside what the move in the middle does, for that move; nothing while the wheel is empty. */
  keys: (id: string | undefined) => ReactNode
}

/**
 * Where a move is chosen, wherever one is (decision 308): for one of a
 * Pokémon's six places, and for the filter of the Pokémon by the moves they
 * can choose. Over the wheel, a bar narrows it: to one type, by its arrows,
 * or, once SEARCH is on, to the moves whose names answer what is typed;
 * CLEAR takes it back to all (decision 302). Under it, what the move in the
 * middle is and does: its type, its category, its figures, its text. What
 * the keys beside it do is the user's.
 */
export function MovePicker({ pack, language, messages, label, moves, start, isMarked, isKnown, still, onPress, keys }: MovePickerProps) {
  const words = messages.creation.dex.species
  const facts = messages.creation.dex.moves
  const [look, setLook] = useState<MoveLook>({ by: 'type', type: undefined })
  const field = useRef<HTMLInputElement>(null)
  // SEARCH puts the cursor in the field at once.
  useEffect(() => {
    if (look.by === 'name') field.current?.focus()
  }, [look.by])
  // The types the moves have; none for all of them.
  const choices: (string | undefined)[] = [undefined, ...typesOffered(moves, pack)]
  const place = look.by === 'type' ? choices.indexOf(look.type) : 0
  const shown = movesListed(moves, pack, { search: look.by === 'name' ? look.name : '', type: look.by === 'type' ? look.type : undefined }, language)
  const narrowed = look.by === 'name' || look.type !== undefined
  const typeName = (type: string): string => pack.types[type.toLowerCase()]?.name[language] ?? type

  const about = (id: string): About | undefined => {
    const move = pack.moves[id]
    if (!move) return undefined
    // Its type and its category first: the wheel's rows name it only.
    const lead = (
      <p className="dn-dex-move-about__facts dn-dex-move-about__facts--full">
        <TypeLabel type={move.type} text={typeName(move.type)} />
        <CategoryIcon category={move.category} label={messages.battle.category[move.category]} compact scale={0.8} />
        <span>{facts.power(move.power)}</span>
        <span>{facts.accuracy(move.accuracy)}</span>
        <span>{messages.creation.moves.pp(move.pp)}</span>
        {isKnown?.(id) && <span className="dn-dex-move-about__known">{facts.known}</span>}
      </p>
    )
    return { lead, text: move.description[language] }
  }

  const bar = (
    <div className="dn-dex-move-look">
      {look.by === 'type' ? (
        <div className="dn-dex-type-pick" role="group" aria-label={words.moveType}>
          <ArrowButton way="previous" label={words.typeBefore} disabled={place <= 0} onClick={() => setLook({ by: 'type', type: choices[place - 1] })} />
          <span className="dn-dex-type-pick__shown" aria-live="polite">
            {look.type === undefined ? words.any : <TypeLabel type={look.type} text={typeName(look.type)} />}
          </span>
          <ArrowButton way="next" label={words.typeAfter} disabled={place >= choices.length - 1} onClick={() => setLook({ by: 'type', type: choices[place + 1] })} />
        </div>
      ) : (
        <input
          ref={field}
          className="dn-dex-field__input dn-dex-move-look__name"
          type="search"
          aria-label={words.moveName}
          placeholder={words.moveName}
          value={look.name}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setLook({ by: 'name', name: event.target.value })}
        />
      )}
      {/* SEARCH turns the bar from a type to a name, and back: one of the two narrows the wheel at a time. */}
      <DexKey shape="square" on={look.by === 'name' || undefined} onClick={() => setLook(look.by === 'name' ? { by: 'type', type: undefined } : { by: 'name', name: '' })}>
        {words.searchKey}
      </DexKey>
      {/* The last key of the bar: a point at its right end (decision 303). */}
      <DexKey shape="end" disabled={!narrowed} onClick={() => setLook({ by: 'type', type: undefined })}>
        {words.clear}
      </DexKey>
    </div>
  )

  return (
    <FilterWheel
      label={label}
      bar={bar}
      size={MOVES_WHEEL}
      none={words.noMove}
      options={shown.map((move) => ({ id: move.id, name: move.name[language] }))}
      start={start}
      isKept={isMarked}
      about={about}
      still={still}
      onPress={onPress}
      keys={keys}
    />
  )
}
