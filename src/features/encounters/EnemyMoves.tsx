import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { CategoryIcon, Slot, TypeLabel } from '../../ui'
import { type CreationContext, type CreationDraft, MOVES_MAX, movesOffered } from '../creation/draft'

export interface EnemyMovesProps {
  pack: DataPack
  context: CreationContext
  draft: CreationDraft
  language: Language
  text: Messages['creation']
  categoryText: Messages['battle']['category']
  onToggle: (move: string) => void
}

/** The moves an enemy may know at its level under the campaign's rules: up to six, at least one. */
export function EnemyMoves({ pack, context, draft, language, text, categoryText, onToggle }: EnemyMovesProps) {
  const full = draft.moves.length >= MOVES_MAX
  return (
    <div className="dn-stack">
      <p className="dn-note" role="status">
        {text.moves.chosen(draft.moves.length)}
      </p>
      {movesOffered(draft, context).map((id) => {
        const move = pack.moves[id]
        if (!move) return null
        const chosen = draft.moves.includes(id)
        return (
          <Slot key={id} selected={chosen} state={chosen ? 'ok' : 'normal'} disabled={full && !chosen} onClick={() => onToggle(id)}>
            <span className="dn-slot__text">
              <span className="dn-slot__line">
                <span className="dn-slot__main dn-text-shadow">{move.name[language]}</span>
                <span className="dn-slot__side">
                  <TypeLabel type={move.type} text={pack.types[move.type.toLowerCase()]?.name[language] ?? move.type} />
                  <CategoryIcon category={move.category} label={categoryText[move.category]} compact scale={0.8} />
                  <span className="dn-slot__pp">{text.moves.pp(move.pp)}</span>
                </span>
              </span>
              <span className="dn-note">{move.description[language]}</span>
            </span>
          </Slot>
        )
      })}
    </div>
  )
}
