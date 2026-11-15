import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'
import { DenbornBattle } from '../../battle/denborn-battle'
import type { DataPack } from '../../data/types'
import { sampleRules } from '../../domain/samples'
import type { Intent } from '../../shared/protocol/battle'
import type { CharacterDocument } from '../../shared/schema/character'
import { OptionButton } from '../../ui'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { sampleQuarry } from '../encounters/samples'
import { BattleScreen } from './BattleScreen'
import { fightSetup } from './fight-setup'
import { type Author, type Choice, type Fight, type FightCommand, type FightContext, fightStep, isReady, openFight, partyView } from './fight'
import { sampleHero } from './samples'

interface LocalTable {
  /** The real engine, playing in the page. */
  engine: DenbornBattle
  fight: Fight
  party: CharacterDocument[]
  /** What became of each player's last intent, by character. */
  answers: Record<string, { id: string; refused?: string }>
  /** The clock at the last thing that happened. */
  now: number
}

/** A fight of the board's own: three characters meet the quarry, with no network and nobody else at the table. */
function openTable(pack: DataPack, timerSeconds: number): LocalTable {
  const rules = sampleRules(pack, 2, 2, 4)
  const party = [
    sampleHero(pack, rules, 'hero-volt-00001', 'pikachu', 16, 'Volt'),
    sampleHero(pack, rules, 'hero-braise-0001', 'charmeleon', 17, 'Braise'),
    sampleHero(pack, rules, 'hero-mousse-0001', 'ivysaur', 16, 'Mousse'),
  ]
  const encounter = sampleQuarry(pack, rules)
  const launch = fightSetup(encounter, party, '11,22,33,44')
  if (!launch.ok) throw new Error(`The board's fight could not be made: ${launch.problem}`)
  const engine = DenbornBattle.start(launch.setup)
  const now = Date.now()
  const fight = openFight(
    {
      encounter: { id: encounter.id, name: encounter.name },
      enemies: encounter.enemies,
      bags: Object.fromEntries(party.map((character) => [character.id, character.bag])),
      enemyBag: encounter.bag,
      timerSeconds: timerSeconds > 0 ? timerSeconds : undefined,
      opening: engine.opening,
    },
    { engine, bagEffect: (item) => pack.items[item]?.bag, absent: new Set(), now },
  )
  return { engine, fight, party, answers: {}, now }
}

/** A player's intent as the command it is for their own Pokémon: what the game master's side does with it. */
function commandOf(intent: Intent, who: string): FightCommand {
  switch (intent.do) {
    case 'lock':
      return { do: 'lock', who, choice: intent.choice }
    case 'unlock':
      return { do: 'unlock', who }
    case 'run':
    case 'switch':
      return { do: intent.do, who, with: intent.with }
    case 'answer':
      return { do: 'answer', who, kind: intent.kind, from: intent.from, accept: intent.accept }
    case 'withdraw':
      return { do: 'withdraw', who, kind: intent.kind }
  }
}

/** Something for a Pokémon nobody plays on the board: its first move that has someone to aim at across the field, or WAIT. */
function anyChoice(table: LocalTable, id: string): Choice {
  const request = table.engine.request(id)
  const side = table.engine.combatant(id).side
  for (const option of request.moves) {
    if (option.disabled) continue
    if (!option.needsTarget) return { do: 'move', move: option.id }
    const target = option.targets.find((other) => table.engine.combatant(other).side !== side)
    if (target) return { do: 'move', move: option.id, target }
  }
  return { do: 'wait' }
}

function Table({ timer }: { timer: number }) {
  const pack = usePack()
  const [table, setTable] = useState(() => openTable(pack, timer))
  const context = (now: number): FightContext => ({ engine: table.engine, bagEffect: (item) => pack.items[item]?.bag, absent: new Set(), now })

  /** Carries commands out one after the other, as the game master's side would. */
  const carryOut = (commands: { author: Author; command: FightCommand; intent?: string }[]): void => {
    const now = Date.now()
    let { fight } = table
    const answers = { ...table.answers }
    for (const { author, command, intent } of commands) {
      const step = fightStep(fight, author, command, context(now))
      fight = step.fight
      if (intent && author !== 'gm') answers[author.player] = { id: intent, ...(step.refused ? { refused: step.refused } : {}) }
    }
    setTable({ ...table, fight, answers, now })
  }

  // The timer runs out by itself, as it does at a real table.
  const deadline = table.fight.timer.deadline
  useEffect(() => {
    if (deadline === undefined) return
    const alarm = setTimeout(() => {
      carryOut([{ author: 'gm', command: { do: 'clock' } }])
    }, Math.max(0, deadline - Date.now()))
    return () => {
      clearTimeout(alarm)
    }
  })

  const shown = partyView(table.fight, context(table.now))
  const [first, second, third] = table.party
  if (!first || !second || !third) return null
  const phone = (character: CharacterDocument) => (
    <Phone>
      <BattleScreen
        pack={pack}
        fight={shown}
        party={table.party}
        me={character.id}
        answer={table.answers[character.id]}
        onIntent={(intent) => {
          carryOut([{ author: { player: character.id }, command: commandOf(intent, character.id), intent: `${Date.now()}` }])
        }}
      />
    </Phone>
  )
  const others = [third.id, ...table.engine.combatants().filter((combatant) => combatant.side === 'enemies').map((combatant) => combatant.id)].filter(
    (id) => table.engine.request(id).canAct && table.engine.request(id).forced === null && !(id in table.fight.locked),
  )

  return (
    <>
      <div className="sb-row">
        {phone(first)}
        {phone(second)}
      </div>
      <div className="sb-row dn-row">
        <OptionButton
          primary
          disabled={others.length === 0 || table.fight.outcome !== undefined}
          onClick={() => {
            carryOut(others.map((id) => ({ author: id === third.id ? { player: id } : 'gm', command: { do: 'lock', who: id, choice: anyChoice(table, id) } })))
          }}
        >
          THE OTHERS CHOOSE
        </OptionButton>
        <OptionButton
          disabled={!isReady(table.fight, context(table.now)) || others.length > 0}
          onClick={() => {
            carryOut([{ author: 'gm', command: { do: 'play' } }])
          }}
        >
          PLAY THE ROUND
        </OptionButton>
        <OptionButton
          onClick={() => {
            setTable(openTable(pack, timer))
          }}
        >
          START AGAIN
        </OptionButton>
      </div>
      <Note>
        A real fight, played in this page by the real battle engine: two players’ phones side by side, Volt’s (A) on the left and Braise’s
        (B) on the right. The buttons underneath stand in for the rest of the table: <strong>THE OTHERS CHOOSE</strong> locks something for
        the third player (Mousse) and for the three enemies; the round is played as soon as everyone has locked. What is{' '}
        <strong>new and to be approved</strong>: WAIT in the top left corner; the party’s ORDER down the left of the ball (a tap opens the
        party’s list, which is also what a player sees once locked, with what each teammate chose); the timer on the right (set{' '}
        <code>timer</code> below); choosing a target on the battlefield plan, where only what the move reaches can be picked; the Bag’s
        list, then its target; RUN and SWITCH asking an ally, who answers on their own phone; a Pokémon’s sheet from the battlefield.
        Not here yet: the round is not played back step by step (the screens jump to its result), and the battlefield names no terrain,
        weather or effect. Both come with the next step.
      </Note>
    </>
  )
}

const meta = {
  title: 'Screens/Battle',
  component: Table,
  args: { timer: 0 },
  argTypes: { timer: { control: 'inline-radio', options: [0, 20, 60] } },
} satisfies Meta<typeof Table>
export default meta

/** Two players' phones in one fight. */
export const PlayersPhones: StoryObj<typeof meta> = { render: (args) => <Table key={args.timer} {...args} /> }
