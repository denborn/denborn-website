import { useState } from 'react'
import type { DataPack } from '../../data/types'
import type { Language } from '../../i18n'
import type { Messages } from '../../i18n/en'
import { TypeLabel } from '../../ui'
import { DexKey, DexPage, Tray } from '../../ui/dex'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import type { StepChrome } from './Creation'
import { MovePicker } from './MovePicker'
import { type CreationContext, type CreationDraft, type DraftChoice, MOVES_MAX, movesOffered } from './draft'

export interface MovesStepProps {
  pack: DataPack
  language: Language
  messages: Messages
  chrome: StepChrome
  context: CreationContext
  draft: CreationDraft
  onChoose: (choice: DraftChoice) => void
}

/**
 * The Pokémon's moves (decision 293): six places, each filled from the moves
 * it may know at its level under the campaign's rules, chosen where every
 * move is chosen (decision 308); a cross on a filled place empties it. One at
 * least.
 */
export function MovesStep({ pack, language, messages, chrome, context, draft, onChoose }: MovesStepProps) {
  const text = messages.creation
  const words = text.dex.moves
  const still = usePrefersReducedMotion()
  /** The place whose move is being chosen, while the list is over the screen. */
  const [place, setPlace] = useState<number>()
  const offered = movesOffered(draft, context)
  const typeName = (type: string): string => pack.types[type.toLowerCase()]?.name[language] ?? type

  const there = place === undefined ? undefined : draft.moves[place]
  // A move is known once: one that has another place cannot be put in this one.
  const elsewhere = (id: string): boolean => draft.moves.includes(id) && id !== there
  const put = (move: string): void => {
    if (place === undefined || elsewhere(move)) return
    if (move !== there) onChoose({ choose: 'slot', slot: place, move })
    setPlace(undefined)
  }

  return (
    <>
      <DexPage
        title={text.moves.title}
        steps={chrome.steps}
        covered={place !== undefined}
        foot={
          <>
            <p className={`dn-dex-count${draft.moves.length > 0 ? ' dn-dex-count--spent' : ''}`} role="status" aria-label={text.moves.chosen(draft.moves.length)}>
              {text.dex.count(draft.moves.length, MOVES_MAX)}
            </p>
            {chrome.next}
          </>
        }
      >
        <div className="dn-dex-sockets" role="group" aria-label={words.list}>
          {Array.from({ length: MOVES_MAX }, (_, at) => {
            const move = pack.moves[draft.moves[at] ?? '']
            return (
              <div key={at} className="dn-dex-socket-place">
                <button
                  type="button"
                  className={`dn-dex-socket${move ? ' dn-dex-socket--filled' : ''}`}
                  // The places fill from the first: one after the first empty one has nothing to be filled after.
                  disabled={at > draft.moves.length}
                  onClick={() => setPlace(at)}
                >
                  {/* Which place it is, said before what it shows: the screen says it by where the box is. */}
                  <span className="dn-visually-hidden">{move ? `${words.place(at + 1)} ` : words.empty(at + 1)}</span>
                  {move ? (
                    <>
                      <span className="dn-dex-socket__name">{move.name[language]}</span>
                      <span className="dn-dex-socket__facts">
                        <TypeLabel type={move.type} text={typeName(move.type)} />
                        <span>{text.moves.pp(move.pp)}</span>
                      </span>
                    </>
                  ) : (
                    <span className="dn-dex-socket__plus" aria-hidden="true" />
                  )}
                </button>
                {/* A filled place's cross empties it at once (decision 308); the places after it move up. */}
                {move && <button type="button" className="dn-dex-socket__cross" aria-label={words.removeMove(move.name[language])} onClick={() => onChoose({ choose: 'slot', slot: at, move: undefined })} />}
              </div>
            )
          })}
        </div>
      </DexPage>

      <Tray open={place !== undefined} title={words.pick} closeLabel={text.dex.close} onClose={() => setPlace(undefined)}>
        {place !== undefined && (
          <MovePicker
            pack={pack}
            language={language}
            messages={messages}
            label={words.list}
            moves={offered}
            start={there}
            isMarked={(id) => draft.moves.includes(id)}
            isKnown={elsewhere}
            still={still}
            onPress={put}
            // OK alone: a move is taken off its place by the cross on the place (decision 309), so the move's text has the room.
            keys={(id) => (
              <DexKey shape="go" disabled={id === undefined || elsewhere(id)} onClick={() => id !== undefined && put(id)}>
                {text.dex.ok}
              </DexKey>
            )}
          />
        )}
      </Tray>
    </>
  )
}
