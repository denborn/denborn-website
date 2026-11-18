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
import { rewardDefaults } from '../../domain/rewards'
import { GmBattle } from './GmBattle'
import { RewardsScreen } from './RewardsScreen'
import { fightSetup } from './fight-setup'
import { type Author, type Choice, type Fight, type FightCommand, type FightContext, fightStep, isReady, openFight, partyView, tableView } from './fight'
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

/**
 * A fight of the board's own: three characters meet the quarry, with no network and nobody else at the table.
 * With `carrierDown`, Mousse carries the party's Revive and has already gone down when the board opens.
 */
function openTable(pack: DataPack, timerSeconds: number, carrierDown = false): LocalTable {
  const rules = sampleRules(pack, 2, 2, 4)
  const heroes = [
    // Moves that show the battlefield at work: a terrain, weathers, a screen, a seed.
    sampleHero(pack, rules, 'hero-volt-00001', 'pikachu', 16, 'Volt', ['thunderbolt', 'electricterrain', 'raindance', 'lightscreen', 'agility', 'thunderwave']),
    sampleHero(pack, rules, 'hero-braise-0001', 'charmeleon', 17, 'Braise', ['flamethrower', 'sunnyday', 'swordsdance', 'willowisp', 'smokescreen', 'dragonbreath']),
    sampleHero(pack, rules, 'hero-mousse-0001', 'ivysaur', 16, 'Mousse', ['leechseed', 'razorleaf', 'sleeppowder', 'growth']),
  ]
  const party = carrierDown ? heroes.map((hero) => (hero.nickname === 'Mousse' ? { ...hero, hp: 1, bag: [{ item: 'revive', quantity: 1 }, { item: 'potion', quantity: 2 }] } : hero)) : heroes
  const encounter = sampleQuarry(pack, rules)
  const launch = fightSetup(encounter, party, '11,22,33,44')
  if (!launch.ok) throw new Error(`The board's fight could not be made: ${launch.problem}`)
  const engine = DenbornBattle.start(launch.setup)
  const now = Date.now()
  const fight = openFight(
    {
      encounter: { id: encounter.id, name: encounter.name },
      // The quarry is fought in the mountains (decision 246).
      scene: { background: 'mountain' },
      enemies: encounter.enemies,
      bags: Object.fromEntries(party.map((character) => [character.id, character.bag])),
      enemyBag: encounter.bag,
      timerSeconds: timerSeconds > 0 ? timerSeconds : undefined,
      opening: engine.opening,
    },
    { engine, bagEffect: (item) => pack.items[item]?.bag, isReusable: (item) => pack.items[item]?.reusable === true, absent: new Set(), now },
  )
  return { engine, fight: carrierDown ? withMousseDown(pack, engine, fight, now) : fight, party, answers: {}, now }
}

/** Plays rounds in which the enemies go for Mousse and nobody else does anything, until Mousse is down. */
function withMousseDown(pack: DataPack, engine: DenbornBattle, opened: Fight, now: number): Fight {
  const context: FightContext = { engine, bagEffect: (item) => pack.items[item]?.bag, isReusable: (item) => pack.items[item]?.reusable === true, absent: new Set(), now }
  const mousse = 'hero-mousse-0001'
  let fight = opened
  for (let round = 0; round < 4 && !engine.combatant(mousse).downed && fight.outcome === undefined; round++) {
    for (const { id, side } of engine.combatants()) {
      const request = engine.request(id)
      if (!request.canAct || request.forced !== null) continue
      const hit = side === 'enemies' ? request.moves.find((option) => !option.disabled && option.targets.includes(mousse) && pack.moves[option.id]?.category !== 'Status') : undefined
      const choice: Choice = hit ? { do: 'move', move: hit.id, target: mousse } : { do: 'wait' }
      fight = fightStep(fight, side === 'enemies' ? 'gm' : { player: id }, { do: 'lock', who: id, choice }, context).fight
    }
    if (isReady(fight, context)) fight = fightStep(fight, 'gm', { do: 'play' }, context).fight
  }
  // The board opens on the choices, not on the telling of those rounds.
  return { ...fight, last: { ...fight.last, log: [], events: [] } }
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

function Table({ timer, seat, carrierDown = false }: { timer: number; seat: 'players' | 'gm'; carrierDown?: boolean }) {
  const pack = usePack()
  const [table, setTable] = useState(() => openTable(pack, timer, carrierDown))
  /** Whether the first player's device is away: the game master may then choose for them. */
  const [away, setAway] = useState(false)
  const absent = new Set(away ? [table.party[0]?.id ?? ''] : [])
  const context = (now: number): FightContext => ({ engine: table.engine, bagEffect: (item) => pack.items[item]?.bag, isReusable: (item) => pack.items[item]?.reusable === true, absent, now })

  /** Carries commands out one after the other, as the game master's side would; gives back why the last one changed nothing. */
  const carryOut = (commands: { author: Author; command: FightCommand; intent?: string }[]): string | undefined => {
    const now = Date.now()
    let { fight } = table
    let refused: string | undefined
    const answers = { ...table.answers }
    for (const { author, command, intent } of commands) {
      const step = fightStep(fight, author, command, context(now))
      fight = step.fight
      refused = step.refused
      if (intent && author !== 'gm') answers[author.player] = { id: intent, ...(step.refused ? { refused: step.refused } : {}) }
    }
    setTable({ ...table, fight, answers, now })
    return refused
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
  const unlocked = (id: string): boolean => table.engine.request(id).canAct && table.engine.request(id).forced === null && !(id in table.fight.locked)
  const enemies = table.engine
    .combatants()
    .filter((combatant) => combatant.side === 'enemies')
    .map((combatant) => combatant.id)
  /** Locks something for those nobody plays on this board. */
  const choose = (ids: readonly string[]) => (): void => {
    carryOut(ids.filter(unlocked).map((id) => ({ author: enemies.includes(id) ? 'gm' : { player: id }, command: { do: 'lock', who: id, choice: anyChoice(table, id) } })))
  }
  const again = (
    <OptionButton
      onClick={() => {
        setTable(openTable(pack, timer, carrierDown))
      }}
    >
      START AGAIN
    </OptionButton>
  )

  if (seat === 'gm') {
    const teammates = [second.id, third.id]
    return (
      <>
        <div className="sb-row sb-row--top">
          <Phone>
            <GmBattle
              pack={pack}
              table={tableView(table.fight, context(table.now))}
              party={table.party}
              away={[...absent]}
              onCommand={(command) => carryOut([{ author: 'gm', command }])}
              onEnd={() => undefined}
              onSession={() => undefined}
              sessionLabel="THE SESSION"
              latency={48}
            />
          </Phone>
          {phone(first)}
        </div>
        <div className="sb-row dn-row">
          <OptionButton primary disabled={!teammates.some(unlocked) || table.fight.outcome !== undefined} onClick={choose(teammates)}>
            BRAISE AND MOUSSE CHOOSE
          </OptionButton>
          <OptionButton
            onClick={() => {
              setAway(!away)
            }}
          >
            {away ? 'VOLT’S PLAYER IS BACK' : 'VOLT’S PLAYER GOES AWAY'}
          </OptionButton>
          {again}
        </div>
        <Note>
          The game master’s seat (decision 250), on the left, beside one player’s phone (Volt): a player’s two screens, mirrored. One
          Pokémon of each line is on the scene, on the base painted for it and at the games’ size (decisions 277 and 283): one of the enemies in the
          foreground, seen from behind, and one of the party facing it. The plates never move (decision 278); the camera does
          (decision 279): its slow round while choices are awaited, closer on a Pokémon while a round is told about it. Nothing on the
          top screen is pressed (decision 272). On the touch screen the
          enemies’ order is under FIGHT and the party’s above it, with everyone’s rank across the two; a press on a Pokémon of either
          puts it on the scene, and picks it as the one the game master plays when it is theirs to play (an enemy, or the Pokémon of a
          player who is away: the button below): its plate is then the large one. The player has the same two lines: the foes above, by
          their places and not by their order, and their party below; a press only looks. FIGHT then gives the Pokémon played
          a move, aimed on the battlefield when it takes a target; under the moves, an enemy’s extra moves are lined up first with ADD AN
          EXTRA MOVE, then the move chosen locks them all, and an away player’s Pokémon can be given STRUGGLE. BAG is the enemies’ Bag;
          RUN trades places with a neighbour and SWITCH trades Speed with another enemy, at once. Once the Pokémon played has locked,
          FIGHT reads CHANGE, and the game master is taken on to the next enemy that has to choose. TOOLS, top centre, is theirs alone:
          the timer (off until turned on, decision 150), each enemy with its class and what it has locked, the order of everyone, what
          is in effect, the last round as it was told, END THE ENCOUNTER and the way to the rest of the session. The round is played by
          the last lock, and told to the game master step by step as to the players.
        </Note>
      </>
    )
  }

  const others = [third.id, ...enemies]
  return (
    <>
      <div className="sb-row">
        {phone(first)}
        {phone(second)}
      </div>
      <div className="sb-row dn-row">
        <OptionButton primary disabled={!others.some(unlocked) || table.fight.outcome !== undefined} onClick={choose(others)}>
          THE OTHERS CHOOSE
        </OptionButton>
        <OptionButton
          disabled={!isReady(table.fight, context(table.now)) || others.some(unlocked)}
          onClick={() => {
            carryOut([{ author: 'gm', command: { do: 'play' } }])
          }}
        >
          PLAY THE ROUND
        </OptionButton>
        {again}
      </div>
      <Note>
        A real fight, played in this page by the real battle engine: two players’ phones side by side, Volt’s (A) on the left and Braise’s
        (B) on the right. The buttons underneath stand in for the rest of the table: <strong>THE OTHERS CHOOSE</strong> locks something for
        the third player (Mousse) and for the three enemies; the round is played as soon as everyone has locked. The scene (decisions
        247, 268, 277 to 279 and 283): one Pokémon of each line on the encounter’s background, on the base painted for it and at the games’ size;
        Black and White’s plates where the games put them, no EXP, never moving; a camera that moves the scene under them; nothing on
        it is pressed (decision 272). The touch screen (decisions 248, 249, 255, 259 and 272): the two
        halves of the games’ ball with FIGHT written in its belt; BAG, SWITCH and RUN; WAIT and INFO hanging from under the strip;
        over FIGHT the foes as they stand on their line, under it the party in the round’s order, and a press on a Pokémon of either
        puts it on the scene, to be looked at, until something is done; the strip with the time, the ping and the battery; the timer
        top centre (set <code>timer</code> below). As before (decision 147): a target chosen on the battlefield plan; the Bag’s list,
        then its target; RUN and SWITCH asking an ally, who answers on their own phone; a Pokémon’s sheet from the battlefield, behind
        INFO. Approved too (decisions 155 and 156): once everyone has locked, the round is told step by step on the top screen, in the
        games’ own words in both languages (decision 154): the scene follows who acts and who is hit, HP bars move as each hit lands,
        and the touch screen lists what was said so far, with NEXT to go on to the next step and SKIP to go straight to the next
        choices. The text goes at the speed set in the app’s Options (slow, normal, fast). The battlefield names the terrain and the
        weather, and MORE lists everything in effect with the games’ own names and descriptions: try Volt’s Electric Terrain or Rain
        Dance, Braise’s Swords Dance, then INFO. Not said yet: what items and Abilities do when they trigger (their
        effects still play).
      </Note>
    </>
  )
}

const meta = {
  title: 'Screens/Battle',
  component: Table,
  args: { timer: 0, seat: 'players' },
  argTypes: { timer: { control: 'inline-radio', options: [0, 20, 60] }, seat: { table: { disable: true } }, carrierDown: { table: { disable: true } } },
} satisfies Meta<typeof Table>
export default meta

/** Two players' phones in one fight. */
export const PlayersPhones: StoryObj<typeof meta> = { render: (args) => <Table key={args.timer} {...args} /> }

/** The Bag of a teammate who is down, open to the party (decision 175). */
export const AFallenTeammatesBag: StoryObj<typeof meta> = {
  args: { carrierDown: true },
  render: (args) => (
    <>
      <Table key={args.timer} {...args} />
      <Note>
        Approved (decision 176). Mousse carried the party’s Revive and is down (decision 175). On Volt’s or Braise’s phone, BAG now
        lists two Bags: their own, then <strong>Mousse’s Bag</strong>, open to the party for as long as Mousse is downed or dead. An item
        picked there is used like their own (still the round’s action) and leaves Mousse’s Bag. A revival item can be aimed at a dead
        Pokémon too (decision 171): on the battlefield its tile lights up for a Revive and for nothing else.
      </Note>
    </>
  ),
}

function Ending() {
  const pack = usePack()
  const [table] = useState(() => openTable(pack, 0))
  const encounter = sampleQuarry(pack, sampleRules(pack, 2, 2, 4))
  // As if the two minions had been defeated and the boss had not.
  const defeated = { ...encounter, enemies: encounter.enemies.filter((enemy) => enemy.class === 'minion') }
  return (
    <>
      <Phone>
        <RewardsScreen pack={pack} encounter={encounter.name} party={table.party} defaults={rewardDefaults(defeated, table.party, pack)} onAward={() => undefined} onBack={() => undefined} />
      </Phone>
      <Note>
        Approved (decisions 162 and 163). The end of an encounter, for the game master: END THE ENCOUNTER on the console opens
        this. Every character of the party has a line (decision 159) with the EXP the app worked out for it from the enemies defeated
        (decisions 130 and 160; here two minions out of three), and one amount of Pokédollars goes to each (decision 134). Every amount
        can be changed; a line says when its EXP takes the character to a new level (decision 161). AWARD AND END writes how the fight
        left everyone (decision 136), gives the amounts and closes the fight; BACK returns to the fight, which goes on. On the
        player’s side, the session screen then says what their character received: see Screens / Session / Join with{' '}
        <code>step</code> set to <code>inRewarded</code>.
      </Note>
    </>
  )
}

/** The game master's seat, beside one player's phone. */
export const GameMastersSeat: StoryObj<typeof meta> = { args: { seat: 'gm' }, render: (args) => <Table key={args.timer} {...args} /> }

/** Ending an encounter: the rewards the game master awards. */
export const EndOfAnEncounter: StoryObj<typeof meta> = { render: () => <Ending /> }
