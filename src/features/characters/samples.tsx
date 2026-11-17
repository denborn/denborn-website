/** Characters made up for the board, kept as the device would keep them, and the list showing them. Never part of the app. */
import { useState } from 'react'
import { sampleCharacter } from '../../domain/samples'
import type { CharacterDocument } from '../../shared/schema/character'
import type { Stored } from '../../storage/library'
import { Device, Note, usePack } from '../../ui/stories/board'
import { CharacterList } from './CharacterList'

/** A character for the board: a species of the data pack under a name a player could give it. */
export interface Sample {
  species: string
  name: string
  level: number
  campaign: string
  female?: boolean
  dead?: boolean
}

export const FEW: readonly Sample[] = [
  { species: 'pikachu', name: 'Volt', level: 12, campaign: 'Les Égarés de Denborn' },
  { species: 'bulbasaur', name: 'Mousse', level: 9, campaign: 'Les Égarés de Denborn' },
  { species: 'charmander', name: 'Braise', level: 14, campaign: 'Night Shift' },
]

export const MANY: readonly Sample[] = [
  ...FEW,
  { species: 'pidgeotto', name: 'Rafale', level: 21, campaign: 'Night Shift' },
  { species: 'eevee', name: 'Noisette', level: 7, campaign: 'Dawn Patrol', female: true },
  { species: 'psyduck', name: 'Migraine', level: 18, campaign: 'Dawn Patrol' },
  { species: 'gastly', name: 'Brume', level: 25, campaign: 'Les Égarés de Denborn' },
  { species: 'snorlax', name: 'Édredon', level: 40, campaign: 'Night Shift' },
  { species: 'moltres', name: 'Seigneur des Flammes', level: 100, campaign: 'La très longue campagne des terres du Nord' },
  { species: 'onix', name: 'Gravier', level: 33, campaign: 'Dawn Patrol' },
  { species: 'mewtwo', name: 'Psyché', level: 70, campaign: 'Night Shift' },
]

export const WITH_DEAD: readonly Sample[] = [
  ...FEW,
  { species: 'cubone', name: 'Osselet', level: 16, campaign: 'Night Shift', dead: true },
  { species: 'gengar', name: 'Minuit', level: 45, campaign: 'Dawn Patrol', dead: true },
]

/** The samples as the device would keep them, and, when asked, one saved by a newer version of the app among them. */
function useEntries(samples: readonly Sample[], unreadable: boolean): Stored<CharacterDocument>[] {
  const pack = usePack()
  const base = sampleCharacter(pack, 5, 'Sample', 4, 0)
  const kept = samples.map(({ species, name, level, campaign, female = false, dead = false }, nth): Stored<CharacterDocument> => {
    const value: CharacterDocument = {
      ...base,
      id: `${species}-${String(nth)}`,
      species,
      nickname: name,
      level,
      gender: female ? 'F' : 'M',
      campaign: { ...base.campaign, name: campaign },
      condition: dead ? { state: 'dead' } : base.condition,
    }
    return { id: value.id, read: { ok: true, value }, raw: '' }
  })
  return unreadable ? [...kept.slice(0, 1), { id: 'newer', read: { ok: false, reason: 'newer-version', found: 2 }, raw: '' }, ...kept.slice(1)] : kept
}

export interface ListArgs {
  samples: readonly Sample[]
  /** One of them was saved by a newer version of the app. */
  unreadable: boolean
  /** False when the browser keeps nothing. */
  kept: boolean
  /** The window's width: a small phone's, a phone's, a computer's at the DS's widest. */
  width: 320 | 412 | 480
}

const HEIGHT = { 320: 568, 412: 839, 480: 760 } as const

export function ListOnBoard({ samples, unreadable, kept, width }: ListArgs) {
  const pack = usePack()
  const entries = useEntries(samples, unreadable)
  const [shown, setShown] = useState<string>()
  const [pressed, setPressed] = useState<string>()
  return (
    <>
      <Device width={width} height={HEIGHT[width]}>
        <CharacterList
          pack={pack}
          entries={entries}
          kept={kept}
          shown={shown}
          onShow={setShown}
          onBack={() => setPressed('BACK')}
          onNew={() => setPressed('NEW')}
          onImport={() => setPressed('IMPORT')}
          onOpen={(id) => setPressed(`SHEET of ${id}`)}
        />
      </Device>
      {pressed && <Note>You pressed {pressed}.</Note>}
    </>
  )
}
