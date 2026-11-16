import { type ReactNode, useState } from 'react'
import type { DataPack } from '../../data/types'
import { abilityAfterEvolving, evolutionOffers } from '../../domain/evolution'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import { OptionButton, PokemonIcon, Slot } from '../../ui'
import { ViewFoot } from './ViewFoot'

export interface EvolveViewProps {
  pack: DataPack
  character: CharacterDocument
  /** Where the last request stands, said over the buttons; nothing when there is nothing to say. */
  notes: ReactNode
  /** True while nothing can be asked. */
  busy: boolean
  /** Evolves the character into a species; `said` is what to say once it has. */
  onEvolve: (to: string, said: string) => void
  onBack: () => void
}

/**
 * The evolutions of a character's species (decisions 7 and 168): each with
 * how it happens, and what is still missing when it cannot happen now. One
 * that can is chosen, then confirmed with what it changes: the Ability it
 * will have (decision 169) and the item it uses up.
 */
export function EvolveView({ pack, character, notes, busy, onEvolve, onBack }: EvolveViewProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.progress.evolve
  const [chosen, setChosen] = useState<string>()
  const dead = character.condition.state === 'dead'
  const from = pack.species[character.species]
  const offers = evolutionOffers(character, pack)
  const itemName = (id: string | undefined): string => (id === undefined ? '' : (pack.items[id]?.name[language] ?? id))
  /** The evolution being confirmed, while it can still happen. */
  const offer = dead ? undefined : offers.find((other) => other.to === chosen && !other.missing)
  const to = offer ? pack.species[offer.to] : undefined
  const ability = from && to ? pack.abilities[abilityAfterEvolving(character.ability, from, to)] : undefined

  return (
    <>
      <div className="dn-stack">
        {dead && (
          <p className="dn-note dn-note--error" role="status">
            {text.dead(character.nickname)}
          </p>
        )}
        {!dead && offers.length === 0 && <p className="dn-note">{text.none(from?.name[language] ?? character.species)}</p>}
        {!dead &&
          offers.map((other) => {
            const species = pack.species[other.to]
            if (!species) return null
            const how = other.method === 'level' ? text.byLevel(other.level ?? 1) : text.byItem(itemName(other.item))
            const row = (
              <>
                <PokemonIcon num={species.num} />
                <span className="dn-slot__text">
                  <span className="dn-text-shadow">{species.name[language]}</span>
                  <span className="dn-note">{other.missing === 'level' ? text.needsLevel(other.level ?? 1) : other.missing === 'item' ? text.needsItem(itemName(other.item)) : `${how} · ${text.ready}`}</span>
                </span>
              </>
            )
            // One that cannot happen yet is read, not chosen.
            return other.missing ? (
              <div key={other.to} className="dn-slot">
                {row}
              </div>
            ) : (
              <Slot key={other.to} selected={chosen === other.to} disabled={busy} onClick={() => setChosen(chosen === other.to ? undefined : other.to)}>
                {row}
              </Slot>
            )
          })}
        {offer && to && (
          <>
            {ability && <p className="dn-note">{text.ability(ability.name[language])}</p>}
            {offer.method !== 'level' && offer.item !== undefined && <p className="dn-note">{text.spends(itemName(offer.item))}</p>}
            <p className="dn-note">{text.movesLater}</p>
          </>
        )}
      </div>
      <ViewFoot
        said={
          offer && to ? (
            <p className="dn-note dn-note--error" role="alert">
              {text.question(character.nickname, to.name[language])}
            </p>
          ) : (
            notes
          )
        }
      >
        {offer && to ? (
          <>
            <OptionButton
              disabled={busy}
              onClick={() => {
                onEvolve(offer.to, text.done(character.nickname, to.name[language]))
                setChosen(undefined)
              }}
            >
              {text.yes}
            </OptionButton>
            <OptionButton primary onClick={() => setChosen(undefined)}>
              {text.no}
            </OptionButton>
          </>
        ) : (
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        )}
      </ViewFoot>
    </>
  )
}
