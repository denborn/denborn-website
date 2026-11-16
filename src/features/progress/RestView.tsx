import { type ReactNode, useState } from 'react'
import type { DataPack } from '../../data/types'
import { MOVES_MAX, type Reselection, movesOpenTo } from '../../domain/rest'
import { maxPp } from '../../game-rules/pp'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import type { CampaignRules } from '../../shared/schema/rules'
import { CategoryIcon, OptionButton, Slot, TypeLabel } from '../../ui'
import { ViewFoot } from './ViewFoot'

export interface RestViewProps {
  pack: DataPack
  character: CharacterDocument
  /** Whether its rest is open: the game master started it and its player has not chosen yet. */
  resting: boolean
  /** The rules it was made under, when this device has them: they say which moves it may know. */
  rules: CampaignRules | undefined
  /** Where the last request stands, said over the buttons; nothing when there is nothing to say. */
  notes: ReactNode
  /** True while nothing can be asked. */
  busy: boolean
  /** True once the choice made here was taken: the rest is over, and that has just been said. */
  done: boolean
  onChoose: (choice: Reselection) => void
  onBack: () => void
}

/**
 * A rest at a Pokémon Center, for the character's player (spec section 3,
 * decision 11): the one time after creation when its Ability and its moves
 * are chosen again. A move it keeps stays as it is; one it drops loses its
 * PP Ups (decision 3), which is said before it happens.
 */
export function RestView({ pack, character, resting, rules, notes, busy, done, onChoose, onBack }: RestViewProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress.rest
  const species = pack.species[character.species]
  const knows = character.moves.map((slot) => slot.id)
  const all = rules ? movesOpenTo(character, rules, pack) : undefined
  // The moves it knows come first, in their order on its sheet: what is chosen is in sight before the long list of what could be.
  const open = all && [...knows.filter((id) => all.includes(id)), ...all.filter((id) => !knows.includes(id))]
  const [ability, setAbility] = useState(character.ability)
  // Without the rules nothing says which moves it may know: its moves stay, and only its Ability is chosen.
  const [moves, setMoves] = useState<readonly string[]>(() => knows.filter((id) => open?.includes(id) ?? true))
  const full = moves.length >= MOVES_MAX
  const dropped = character.moves.filter((slot) => slot.ppUps > 0 && !moves.includes(slot.id))

  if (!resting) {
    return (
      <>
        <div className="dn-stack">{!done && <p className="dn-note">{text.over}</p>}</div>
        <ViewFoot said={notes}>
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </ViewFoot>
      </>
    )
  }
  return (
    <>
      <div className="dn-stack">
        <p className="dn-note">{text.intro}</p>
        <div role="group" aria-label={text.ability} className="dn-entry">
          <span className="dn-label">{text.ability}</span>
          {species?.abilities.map((id) => {
            const other = pack.abilities[id]
            if (!other) return null
            return (
              <Slot key={id} selected={ability === id} state={ability === id ? 'ok' : 'normal'} onClick={() => setAbility(id)}>
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">
                    {other.name[language]}
                    {id === species.hiddenAbility && ` (${messages.creation.identity.hidden})`}
                  </span>
                  <span className="dn-note">{other.description[language]}</span>
                </span>
              </Slot>
            )
          })}
        </div>
        {!open && (
          <p className="dn-note dn-note--error" role="status">
            {text.noRules}
          </p>
        )}
        {open && (
          <div role="group" aria-label={text.moves(moves.length)} className="dn-entry">
            <span className="dn-label" role="status">
              {text.moves(moves.length)}
            </span>
            {dropped.map((slot) => (
              <p key={slot.id} className="dn-note dn-note--error" role="status">
                {text.losesPpUps(pack.moves[slot.id]?.name[language] ?? slot.id)}
              </p>
            ))}
            {open.map((id) => {
              const move = pack.moves[id]
              if (!move) return null
              const chosen = moves.includes(id)
              const known = character.moves.find((slot) => slot.id === id)
              return (
                <Slot key={id} selected={chosen} state={chosen ? 'ok' : 'normal'} disabled={full && !chosen} onClick={() => setMoves(chosen ? moves.filter((other) => other !== id) : [...moves, id])}>
                  <span className="dn-slot__text">
                    <span className="dn-slot__line">
                      <span className="dn-slot__main dn-text-shadow">{move.name[language]}</span>
                      <span className="dn-slot__side">
                        <TypeLabel type={move.type} text={pack.types[move.type.toLowerCase()]?.name[language] ?? move.type} />
                        <CategoryIcon category={move.category} label={messages.battle.category[move.category]} compact scale={0.8} />
                        {/* A move it knows keeps the PP it has; a new one comes with all of its own. */}
                        <span className="dn-slot__pp">{known ? messages.sheet.pp(known.pp, maxPp(move.pp, known.ppUps, move.fixedPp)) : messages.creation.moves.pp(move.pp)}</span>
                      </span>
                    </span>
                    <span className="dn-note">
                      {known && `${text.known} · `}
                      {move.description[language]}
                    </span>
                  </span>
                </Slot>
              )
            })}
          </div>
        )}
      </div>
      <ViewFoot said={notes}>
        <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        <OptionButton primary disabled={busy || moves.length === 0} onClick={() => onChoose({ ability, moves })}>
          {text.confirm}
        </OptionButton>
      </ViewFoot>
    </>
  )
}
