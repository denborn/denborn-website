import { useMemo, useState } from 'react'
import type { DataPack, MoveData } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { answers } from '../../shared/text/plain'
import { CategoryIcon, Slot, TextField, TypeLabel } from '../../ui'

export interface MovesRuleProps {
  pack: DataPack
  /** The common moves, in the order they were chosen. */
  chosen: readonly string[]
  onChange: (chosen: string[]) => void
  language: Language
  messages: Messages
}

/** How many moves a search lists at once: the rest are found by typing more of the name. */
const FOUND_MAX = 30

/**
 * The common moves: those every Pokémon of the campaign may choose. The ones
 * chosen stay listed on top; the others are found by name among the moves a
 * game master may offer (decision 71).
 */
export function MovesRule({ pack, chosen, onChange, language, messages }: MovesRuleProps) {
  const text = messages.campaigns
  const [search, setSearch] = useState('')
  const offered = useMemo(
    () =>
      Object.values(pack.moves)
        .filter((move) => move.supplement)
        .sort((a, b) => a.name[language].localeCompare(b.name[language], language)),
    [pack, language],
  )
  const found = search.trim() === '' ? [] : offered.filter((move) => !chosen.includes(move.id) && answers(move.name[language], search))
  const row = (move: MoveData, isChosen: boolean) => (
    <Slot key={move.id} selected={isChosen} state={isChosen ? 'ok' : 'normal'} onClick={() => onChange(isChosen ? chosen.filter((id) => id !== move.id) : [...chosen, move.id])}>
      <span className="dn-slot__text">
        <span className="dn-slot__line">
          <span className="dn-slot__main dn-text-shadow">{move.name[language]}</span>
          <span className="dn-slot__side">
            <TypeLabel type={move.type} text={pack.types[move.type.toLowerCase()]?.name[language] ?? move.type} />
            <CategoryIcon category={move.category} label={messages.battle.category[move.category]} compact scale={0.8} />
          </span>
        </span>
        <span className="dn-note">{move.description[language]}</span>
      </span>
    </Slot>
  )

  return (
    <div className="dn-stack">
      <p className="dn-note">{text.commonHint}</p>
      <p className="dn-note" role="status">
        {text.commonChosen(chosen.length)}
      </p>
      {chosen.map((id) => {
        const move = pack.moves[id]
        return move ? row(move, true) : null
      })}
      <TextField label={text.commonSearch} value={search} onChange={setSearch} type="search" autoComplete="off" enterKeyHint="search" />
      {found.slice(0, FOUND_MAX).map((move) => row(move, false))}
      {found.length > FOUND_MAX && <p className="dn-note">{text.typeMore(found.length - FOUND_MAX)}</p>}
    </div>
  )
}
