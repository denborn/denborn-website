import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DataPack } from '../../data/types'
import { sampleRules } from '../../domain/samples'
import type { MobClass } from '../../game-rules/rewards'
import type { Encounter, Enemy } from '../../shared/schema/encounter'
import type { CampaignRules } from '../../shared/schema/rules'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { type DraftChoice, choose, movesOffered } from '../creation/draft'
import { EncounterEditor, type EncounterView } from './EncounterEditor'
import { EncounterList } from './EncounterList'
import { enemyContext, enemyOf, newEnemy } from './encounter-draft'

/** An enemy made the way the editor makes one: the species, then the first gender, Ability and moves it offers. */
function built(pack: DataPack, rules: CampaignRules, id: string, species: string, level: number, mobClass: MobClass, agony: boolean, nickname = ''): Enemy {
  const context = enemyContext(rules, pack, level)
  const data = pack.species[species]
  let build = choose(newEnemy(id, rules).build, { choose: 'species', species }, context)
  const choices: DraftChoice[] = [
    { choose: 'nickname', nickname },
    { choose: 'gender', gender: data?.genders[0] ?? 'N' },
    { choose: 'nature', nature: 'adamant' },
    { choose: 'ability', ability: data?.abilities[0] ?? '' },
    ...movesOffered(build, context)
      .slice(0, 3)
      .map((move): DraftChoice => ({ choose: 'move', move })),
  ]
  for (const choice of choices) build = choose(build, choice, context)
  const enemy = enemyOf({ id, level, class: mobClass, agony, build }, rules)
  if (!enemy) throw new Error(`The board's ${species} could not be built`)
  return enemy
}

function quarry(pack: DataPack, rules: CampaignRules): Encounter {
  return {
    id: 'encounter-quarry',
    name: 'La carrière',
    enemies: [built(pack, rules, 'enemy-geodude-1', 'geodude', 12, 'minion', false), built(pack, rules, 'enemy-onix-0001', 'onix', 18, 'boss', true, 'Vieux Roc'), built(pack, rules, 'enemy-geodude-2', 'geodude', 12, 'minion', false)],
    bag: [{ item: 'potion', quantity: 2 }],
  }
}

function Editor({ prepared }: { prepared: boolean }) {
  const pack = usePack()
  const rules = sampleRules(pack, 2, 2, 4)
  const [view, setView] = useState<EncounterView>({ at: 'hub' })
  const [encounter, setEncounter] = useState<Encounter | undefined>(() => (prepared ? quarry(pack, rules) : undefined))
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
  const river: Encounter = { id: 'encounter-river', name: 'Le gué', enemies: [built(pack, rules, 'enemy-psyduck-1', 'psyduck', 9, 'minion', false)], bag: [] }
  return (
    <Phone>
      <EncounterList campaign="Les Égarés de Denborn" encounters={[quarry(pack, rules), river]} onBack={() => undefined} onNew={() => undefined} onOpen={() => undefined} />
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
