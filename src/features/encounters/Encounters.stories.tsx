import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { sampleRules } from '../../domain/samples'
import type { Encounter } from '../../shared/schema/encounter'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { EncounterEditor, type EncounterView } from './EncounterEditor'
import { EncounterList } from './EncounterList'
import { sampleFord, sampleQuarry } from './samples'

function Editor({ prepared, opened = { at: 'hub' } }: { prepared: boolean; opened?: EncounterView }) {
  const pack = usePack()
  const rules = sampleRules(pack, 2, 2, 4)
  const [view, setView] = useState<EncounterView>(opened)
  const [encounter, setEncounter] = useState<Encounter | undefined>(() => (prepared ? sampleQuarry(pack, rules) : undefined))
  let made = 0
  return (
    <Phone>
      <EncounterEditor
        pack={pack}
        rules={rules}
        encounter={encounter}
        view={view}
        onView={setView}
        newId={() => `board-enemy-${Date.now()}-${made++}`}
        onSave={(saved) => {
          setEncounter(saved)
          return { ok: true }
        }}
        onRemove={() => undefined}
        onBack={() => undefined}
      />
    </Phone>
  )
}

function Listed() {
  const pack = usePack()
  const rules = sampleRules(pack, 2, 2, 4)
  return (
    <Phone>
      <EncounterList campaign="Les Égarés de Denborn" encounters={[sampleQuarry(pack, rules), sampleFord(pack, rules)]} onBack={() => undefined} onNew={() => undefined} onOpen={() => undefined} />
    </Phone>
  )
}

const meta = { title: 'Screens/Encounters' } satisfies Meta
export default meta

/** An encounter already prepared: a boss between two minions. */
export const Prepared: StoryObj = {
  render: () => (
    <>
      <Editor prepared />
      <Note>
        An encounter’s page, laid out like a campaign’s: its name, its enemies in the order they stand from A, their Bag. A tap on an enemy
        opens it: a row for each thing to set, built with the very screens a character is created with (any Pokémon, at its own level),
        plus what only an enemy has: its class (decision 133: a label for the game master, which sets what it pays) and what happens to it
        at 0 HP (it faints, or agonizes like a character). MOVE LEFT and MOVE RIGHT change its place on the line. The Pokédollars are
        worked out as you build (decision 134); EXP waits for the party.
      </Note>
    </>
  ),
}

/** The PP Ups of an enemy's moves. */
export const EnemyPpUps: StoryObj = {
  render: () => (
    <>
      <Editor prepared opened={{ at: 'enemy', id: 'enemy-onix-0001', field: 'ppUps' }} />
      <Note>
        An enemy’s PP Ups, a row of its page under its moves: each move it knows takes from none to three, and the line under it says the
        PP it then has. A move whose PP cannot be raised says so and takes none. PP Ups stay with their move: taking a move away loses
        them (decision 3). Awaiting the owner’s approval.
      </Note>
    </>
  ),
}

/** An encounter being prepared for the first time. */
export const NewEncounter: StoryObj = {
  render: () => (
    <>
      <Editor prepared={false} />
      <Note>
        A new encounter: a name and at least one enemy. A new enemy starts at the level characters start at, as a MINION that faints; its
        Pokémon comes first, and the rest opens once it is chosen. SAVE THE ENCOUNTER lights up when nothing is left TO CHOOSE or TO FIX.
      </Note>
    </>
  ),
}

/** The encounters of a campaign. */
export const List: StoryObj = {
  render: () => (
    <>
      <Listed />
      <Note>The encounters prepared for a campaign, reached from the campaign’s page. A row opens one; NEW starts one.</Note>
    </>
  ),
}
