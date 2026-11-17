import { useState } from 'react'
import type { DataPack, SpeciesData } from '../../data/types'
import { type Language, useLanguage, useMessages } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Stored } from '../../storage/library'
import { DenInside, DualScreen, OptionButton, PickStrip, type PickStripItem, Screen, Showcase, type ShowcaseMember } from '../../ui'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { battleBaseRow } from '../../data/sprites'
import { directionOf, groundTypeOf, passageOf, stepTo } from '../../ui/showcase'
import type { CastMember } from '../../ui/wanderers'
import { DEN, DenScreen } from '../home/DenScreen'
import { useTitleAnimation } from '../options/title-animation'
import { typeName } from '../sheet/shown'
import { type CardFace, CharacterCard } from './CharacterCard'

export interface CharacterListProps {
  pack: DataPack
  entries: readonly Stored<CharacterDocument>[]
  /** False when the browser keeps nothing past the visit. */
  kept: boolean
  /** The one shown, by the id it is kept under; the first when it is not among them. */
  shown?: string | undefined
  /** Another one is shown. */
  onShow: (id: string) => void
  onBack: () => void
  onNew: () => void
  /** Opens the screen that takes in a character from its file, link or QR code. */
  onImport: () => void
  /** Opens the sheet of one of them, by the id it is kept under. */
  onOpen: (id: string) => void
}

/** A Pokémon that cannot be told, for an entry that cannot be read: MissingNo. stands in its place (decision 181). */
const UNTOLD: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'> = { id: 'missingno', sprite: null, femaleSprite: false }

/**
 * The characters kept on this device: on the top screen they are on the plain
 * round the den, each under its name (decision 225), the living walking, the
 * dead in the den's light (decision 228). On the bottom screen, inside the
 * den (decisions 241 to 244), one is shown at a time, large and alive on its ground, what is told
 * of it on a small sheet beside it, SHEET under that to open its sheet; the
 * arrows and a swipe go round them all, and a strip of their icons across the
 * screen picks one directly. The den is the one of every
 * other page, so it carries on from the home and back.
 */
export function CharacterList({ pack, entries, kept, shown, onShow, onBack, onNew, onImport, onOpen }: CharacterListProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.characters
  // Nothing moves by itself with reduced motion, nor with the Options' switch off (decision 206): the rain stands, and so do they.
  const reduced = usePrefersReducedMotion()
  const switchedOff = useTitleAnimation() === 'off'
  const still = reduced || switchedOff
  const cast = entries.flatMap((entry): CastMember[] => {
    if (!entry.read.ok) return []
    const character = entry.read.value
    const species = pack.species[character.species]
    return species ? [{ id: entry.id, name: character.nickname, species, female: character.gender === 'F', dead: character.condition.state === 'dead' }] : []
  })

  const found = entries.findIndex((entry) => entry.id === shown)
  const index = found < 0 ? 0 : found
  const current = entries[index]
  // The side the one shown came in from: the right when going on, the left when going back.
  const [direction, setDirection] = useState<1 | -1>(1)
  // Where the one shown stands: the den's backdrop puts its own spot under it (decision 257).
  const [ground, setGround] = useState<HTMLElement | null>(null)
  const show = (to: number): void => {
    const next = entries[to]
    if (!next || to === index) return
    setDirection(directionOf(index, to))
    onShow(next.id)
  }
  const step = (by: 1 | -1): void => {
    const next = entries[stepTo(index, by, entries.length)]
    if (!next || next.id === current?.id) return
    setDirection(by)
    onShow(next.id)
  }

  const told = current ? tell(current, pack, language, messages) : undefined
  return (
    <DualScreen>
      <DenScreen key={DEN} label={text.title} cast={cast} />
      <Screen kind="den" label={text.title}>
        <DenInside under={told ? ground : null} />
        <div className="dn-carousel">
          <h2 className="dn-visually-hidden" tabIndex={-1} data-page-heading>
            {text.title}
          </h2>
          {!kept && (
            <p className="dn-note dn-note--error" role="alert">
              {text.notKept}
            </p>
          )}
          <div className="dn-carousel__sides">
            <div className="dn-carousel__side">
              <CharacterCard id={current?.id ?? ''} face={told?.face ?? { kind: 'said', text: text.empty }} direction={direction} levelLabel={text.level} still={still} />
              {current && (
                <OptionButton secondary onClick={() => onOpen(current.id)}>
                  {text.sheet}
                </OptionButton>
              )}
            </div>
            {told && (
              <Showcase
                shown={told.member}
                direction={direction}
                still={still}
                labels={entries.length > 1 ? { previous: text.previous, next: text.next } : undefined}
                onPrevious={() => step(-1)}
                onNext={() => step(1)}
                onGround={setGround}
              />
            )}
          </div>
          {told && (
            <PickStrip label={text.strip} items={entries.map((entry) => itemOf(entry, pack, text))} chosen={current?.id} onPick={(id) => show(entries.findIndex((entry) => entry.id === id))} still={still} />
          )}
          <div className="dn-foot dn-foot--even">
            <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
            <OptionButton primary onClick={onNew}>
              {text.new}
            </OptionButton>
            <OptionButton secondary onClick={onImport}>
              {messages.import.entry}
            </OptionButton>
          </div>
        </div>
      </Screen>
    </DualScreen>
  )
}

/** What is shown of a kept entry: its Pokémon and its card. One that cannot be read is MissingNo., its card saying why. */
function tell(entry: Stored<CharacterDocument>, pack: DataPack, language: Language, messages: Messages): { member: ShowcaseMember; face: CardFace } {
  const text = messages.characters
  const species = entry.read.ok ? pack.species[entry.read.value.species] : undefined
  if (!entry.read.ok || !species) {
    const said = unreadable(entry, text)
    return { member: { id: entry.id, name: said, species: UNTOLD, female: false, dead: false, passage: 'hop', base: battleBaseRow(undefined) }, face: { kind: 'said', text: said } }
  }
  const character = entry.read.value
  const dead = character.condition.state === 'dead'
  return {
    member: { id: entry.id, name: character.nickname, species, female: character.gender === 'F', dead, passage: passageOf(dead, species.types), base: battleBaseRow(groundTypeOf(dead, species.types)) },
    face: {
      kind: 'character',
      level: character.level,
      name: character.nickname,
      species: species.name[language],
      types: species.types.map((type) => ({ type, text: typeName(pack, type, language) })),
      campaign: character.campaign.name,
      dead: dead ? messages.sheet.dead : undefined,
    },
  }
}

/** What an entry that cannot be read is called, or one whose species this device does not know. */
function unreadable(entry: Stored<CharacterDocument>, text: Messages['characters']): string {
  return !entry.read.ok && entry.read.reason === 'newer-version' ? text.unreadableNewer : text.unreadable
}

/** A kept entry in the strip: its species' icon, the "?" for one that cannot be told, under its name. */
function itemOf(entry: Stored<CharacterDocument>, pack: DataPack, text: Messages['characters']): PickStripItem {
  if (!entry.read.ok) return { id: entry.id, num: 0, name: unreadable(entry, text) }
  return { id: entry.id, num: pack.species[entry.read.value.species]?.num ?? 0, name: entry.read.value.nickname }
}
