import { type ReactNode, useCallback, useId, useMemo, useState } from 'react'
import type { MoveChoice } from '../../battle/contract'
import { sceneArt } from '../../data/battle-scene'
import type { DataPack } from '../../data/types'
import { useBattleText } from '../../data/use-battle-text'
import type { LineSide } from '../../game-rules/reach'
import { useLanguage, useMessages } from '../../i18n'
import type { PlayerFight } from '../../shared/protocol/battle'
import type { CharacterDocument } from '../../shared/schema/character'
import {
  AbilityBand,
  BattlePlate,
  Battler,
  type BattlerCue,
  type CommandId,
  CommandMenu,
  DualScreen,
  FieldEffects,
  FieldPlan,
  type FieldTile,
  ItemIconImage,
  MessageBox,
  MoveButton,
  OptionButton,
  OrderBar,
  type OrderBarEntry,
  PokemonIcon,
  ScenePlate,
  type SceneShot,
  type SceneSide,
  SceneSpot,
  SceneWorld,
  Screen,
  ScrollingText,
  StatusBadge,
  TileButton,
  TopStrip,
  TypeLabel,
  pingLevel,
  spriteScale,
  useBattery,
  useClock,
} from '../../ui'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import { TEXT_PACE, useTextSpeed } from '../options/text-speed'
import { FighterSheet, statusOf } from './FighterSheet'
import { ToolsView } from './ToolsView'
import { effectsOf, groundOf } from './effects'
import type { Choice, FightCommand, TableView } from './fight'
import { type Fighter, clockText, fightersOf, reaches } from './fighters'
import { type OrderEntry, orderBars } from './order-bar'
import { type Step, abilityShownAt, sentence, standingAfter } from './round-script'
import { type SceneAsk, sceneFocus, sceneFollowing } from './scene-focus'
import { NEAR_LINE, type SeatAsk, extrasStep, nextToPlay } from './seat'
import { useCountdown } from './use-countdown'
import { usePlayback } from './use-playback'
import { type Wording, choiceWords, effectWords, moveName as moveNameIn, moveWords, tellingOf } from './words'

/** What only the game master's seat has: the whole table, and what only they can do. */
export interface GmSide {
  /** The whole table, as only the game master is shown it. */
  table: TableView
  /** The characters whose player is away right now: the game master may choose for them (decision 16). */
  away: readonly string[]
  /** The game master's own commands: the timer, and playing a round nobody has a choice in. */
  onCommand: (command: Extract<FightCommand, { do: 'timer' | 'pause' | 'resume' | 'play' }>) => void
  /** Opens the end of the encounter: its rewards, then its end (decision 136). */
  onEnd: () => void
  /** Goes to the rest of the session, and what that way is called. */
  onSession: () => void
  sessionLabel: string
}

export interface BattleProps {
  pack: DataPack
  /** The fight as this seat is told it: a player's view of it, or the game master's whole table. */
  fight: PlayerFight
  /** The characters in the fight: their names, levels and builds. */
  party: readonly CharacterDocument[]
  /** Who sits here: a player, or the game master with what only they have. */
  seat: { role: 'player' } | ({ role: 'gm' } & GmSide)
  /** The Pokémon this seat may play: a player's own; for the game master every enemy, and the Pokémon of each player who is away. */
  playable: readonly string[]
  /** Asks something for one of them. Gives back true when it is known at once that it was refused. */
  onAsk: (who: string, ask: SeatAsk) => boolean
  /** True while nothing more can be asked: an ask is not answered yet, or the line is down. */
  pending: boolean
  /** The last thing asked was refused, and nothing was asked since. */
  refused: boolean
  /** Said in the place of everything else while nothing can be asked: the connection dropped, the game master is away. */
  notice?: string | undefined
  /** How long the relay took to answer the last check of this device's line, in milliseconds. */
  latency?: number | undefined
}

type Locked = PlayerFight['locked'][string]

/** What the touch screen shows. Everything but `home` is something that was opened. */
type View =
  | { at: 'home' }
  | { at: 'moves' }
  | { at: 'target'; move: string }
  | { at: 'allySwitch'; first?: string }
  | { at: 'bag' }
  /** `from` names the fallen teammate whose Bag the item comes from (decision 175); nothing for the Pokémon's own, or the enemies'. */
  | { at: 'bagTarget'; item: string; from?: string }
  | { at: 'bagMove'; item: string; target: string; from?: string }
  | { at: 'run' }
  | { at: 'switch' }
  | { at: 'party' }
  | { at: 'field' }
  | { at: 'effects' }
  | { at: 'sheet'; id: string }
  /** The game master's alone (decision 250). */
  | { at: 'tools' }

const HOME: View = { at: 'home' }
/** Under this much time, the clock turns red. */
const LOW_TIME_MS = 10_000
const NO_EXTRAS: readonly MoveChoice[] = []

/** What a step of the round has one Pokémon of the scene do, when it has it do anything. */
function cueOf(motion: Step['motion'], id: string, beat: string): BattlerCue | undefined {
  if (!motion) return undefined
  if (motion.attack === id) return { move: 'attack', beat }
  return motion.hit === id ? { move: 'hit', beat } : undefined
}

/**
 * A fight's two screens (decisions 245 to 250 and 259 to 275), the same for a
 * player and for the game master: the scene on the top one, one Pokémon of
 * each line on the encounter's background, placed as Showdown places them,
 * and never pressed; on the touch screen whatever is being done for the
 * Pokémon played: the commands with the order of the round, a move and its
 * target, the Bag, Run and Switch, the battlefield and a Pokémon's sheet. A
 * player plays their own Pokémon and sees their party in the foreground; the
 * game master sees the enemies there, picks which one to play from the order,
 * and has TOOLS besides.
 *
 * It decides nothing: it shows the fight it is given and asks, through
 * `onAsk`, for what was chosen. What it shows changes when the game master's
 * side of the session says so.
 */
export function Battle({ pack, fight, party, seat, playable, onAsk, pending, refused, notice, latency }: BattleProps) {
  const language = useLanguage()
  const own = useId()
  const messages = useMessages()
  const battle = messages.battle
  const words = battle.field
  const text = battle.choosing
  const gmText = battle.console
  const gm = seat.role === 'gm' ? seat : undefined
  const left = useCountdown(fight.timer)
  const battleText = useBattleText()
  const clock = useClock(language)
  const battery = useBattery()
  const reduced = usePrefersReducedMotion()
  /** The text speed the player chose in the options, as in the games (decision 155). */
  const pace = TEXT_PACE[useTextSpeed()]

  // The round that was just played is told step by step before its result shows (decision 91).
  const say = useCallback((key: string) => battleText.messages[key]?.[language], [battleText, language])
  const { script, told, playing, step, advance, skip } = usePlayback(fight.last, say, pace)

  // What was opened lasts for the round it was opened in.
  const [opened, setOpened] = useState<{ round: number; view: View }>({ round: fight.round, view: HOME })
  const view = opened.round === fight.round ? opened.view : HOME
  // Whom a press in a line of the command screen put on the scene, to be looked at (decisions 269 and 272): for the round it was pressed in, until something is asked for the Pokémon played or the commands are come back to.
  const [turned, setTurned] = useState<{ round: number; ask: SceneAsk }>({ round: fight.round, ask: {} })
  const brought: SceneAsk = turned.round === fight.round ? turned.ask : {}
  const show = (next: View): void => {
    setOpened({ round: fight.round, view: next })
    if (next.at === 'home') setTurned({ round: fight.round, ask: {} })
  }
  // The game master's own: whom they picked to play, and the extra moves lined up for an enemy, for the round they were set in.
  const [kept, setKept] = useState<{ round: number; picked?: string; extras: Record<string, readonly MoveChoice[]>; addingExtra: boolean }>({ round: fight.round, extras: {}, addingExtra: false })
  const mine = kept.round === fight.round ? kept : { round: fight.round, extras: {}, addingExtra: false }

  // While the round is told, everyone stands as the steps told so far leave them.
  const named = useMemo(() => new Set(Object.keys(battleText.states)), [battleText])
  const fighters = fightersOf(playing ? { ...fight, combatants: standingAfter(fight.last.before, script.steps, told + 1) } : fight, party, pack, language, named)
  const near: LineSide = NEAR_LINE[seat.role]
  const nearLine = fighters.filter((fighter) => fighter.side === near)
  const farLine = fighters.filter((fighter) => fighter.side !== near)
  const byId = (id: string | undefined): Fighter | undefined => fighters.find((fighter) => fighter.id === id)
  const nameOf = (id: string): string => byId(id)?.name ?? id

  // --- Who is played ----------------------------------------------------------
  /** Whether a Pokémon still has its action to choose this round. */
  const toChoose = (id: string): boolean => {
    const request = fight.requests[id]
    return fight.outcome === undefined && !(id in fight.locked) && request?.canAct === true && request.forced === null
  }
  // A player plays their own Pokémon. The game master plays the one they picked, or else the next enemy that has to choose.
  const actorId = gm ? (mine.picked !== undefined && playable.includes(mine.picked) ? mine.picked : nextToPlay(fight.order, playable, toChoose)) : playable[0]
  const actor = byId(actorId)
  const request = actor ? fight.requests[actor.id] : undefined
  const locked = actor ? fight.locked[actor.id] : undefined
  // The timer binds players only (decision 14): once it has run out, nothing more is chosen for a player's Pokémon.
  const canChoose = fight.outcome === undefined && actor !== undefined && request?.canAct === true && request.forced === null && !(actor.side === 'players' && fight.timer.expired)
  const extras = (actor && mine.extras[actor.id]) ?? NO_EXTRAS
  /** Everyone who has a choice has locked, and the round was not played by its last lock: nobody had one. */
  const toPlay = gm?.table.ready === true && fight.outcome === undefined

  /** Asks something for the Pokémon played. Whoever was being looked at meanwhile, the scene goes back to that Pokémon and to whoever faces it (decision 269). */
  const ask = (what: SeatAsk): boolean => {
    setTurned({ round: fight.round, ask: {} })
    return actor ? onAsk(actor.id, what) : true
  }
  const lockWith = (choice: Choice): void => {
    if (!actor) return
    const refusedAtOnce = ask({ do: 'lock', choice, ...(gm && actor.side === 'enemies' && extras.length > 0 ? { extra: extras } : {}) })
    // The game master goes on to the next Pokémon that has to choose.
    if (gm && !refusedAtOnce) setKept({ round: fight.round, extras: mine.extras, addingExtra: false })
    show(HOME)
  }
  /** A move chosen for the Pokémon played: one more extra move while the game master is adding one, its locked action otherwise. */
  const chooseMove = (move: MoveChoice): void => {
    if (actor && mine.addingExtra) {
      setKept({ ...mine, extras: { ...mine.extras, [actor.id]: extrasStep(extras, { do: 'add', move }) }, addingExtra: false })
      show({ at: 'moves' })
    } else lockWith({ do: 'move', ...move })
  }
  const pick = (id: string): void => {
    setKept({ ...mine, picked: id, addingExtra: false })
    show(HOME)
  }

  // --- The scene ------------------------------------------------------------
  const shownSoFar = playing ? script.steps.slice(0, told + 1) : []
  // Each line shows the Pokémon played, when it stands on that line, unless another one of it is being looked at.
  const resting: SceneAsk = {
    near: brought.near ?? (actor?.side === near ? actor.id : undefined),
    far: brought.far ?? (actor && actor.side !== near ? actor.id : undefined),
    // A Pokémon the step being told takes out of the fight is still there to be seen going.
    leaving: step?.change?.dead ? [step.change.id] : [],
  }
  // While the round is told, the scene follows the action (decision 91).
  const scene = playing ? sceneFollowing(fighters, near, resting, shownSoFar.map((earlier) => earlier.show)) : sceneFocus(fighters, near, resting)
  // The sprites play what the step says happened: the one acting lunges, the one hit recoils.
  const beat = `${fight.last.round} ${told}`
  const bring = (fighter: Fighter): void => {
    setTurned({ round: fight.round, ask: fighter.side === near ? { ...brought, near: fighter.id } : { ...brought, far: fighter.id } })
  }
  const art = sceneArt(fight.scene)
  /** The camera (decision 279): it goes its round while choices are awaited, and closes in on the Pokémon a step is about, the one hit before the one acting, while the round is told. */
  const shot = ((): SceneShot => {
    if (!playing) return 'roam'
    const about = byId(step?.motion?.hit ?? step?.show[0])
    return about ? (about.side === near ? 'near' : 'far') : 'home'
  })()

  const askToMe = !gm && view.at === 'home' ? fight.asks.find((entry) => entry.to === actorId) : undefined
  const myAsk = (kind: 'run' | 'switch') => fight.asks.find((entry) => entry.kind === kind && entry.from === actorId)

  const wording: Wording = { pack, language, messages, nameOf }
  const telling = tellingOf(wording, battleText)
  /** The terrain and the weather, named on the plan, and everything in effect, behind MORE (decisions 89 and 92 to 94). */
  const inEffect = { ...effectWords(wording, battleText), ...(gm ? { scope: gmText.scope } : {}) }
  const ground = groundOf(fight.field, inEffect)
  // An effect's mark points to the line it touches, as the plan lies: the game master's plan has the enemies at the bottom.
  const effects = effectsOf(fight.field, fighters, inEffect).map((effect) => (gm && effect.scope !== 'field' ? { ...effect, scope: effect.scope === 'foes' ? ('party' as const) : ('foes' as const) } : effect))
  /** Everything said so far of the round being told, in order. */
  const saidSoFar = shownSoFar.flatMap((earlier) => (earlier.said ? (sentence(earlier.said, telling) ?? []) : []))
  // An Ability that acts is named by a band on its Pokémon's side, not in the message band (decision 165).
  const spoken = shownSoFar.flatMap((earlier) => (earlier.said && earlier.said.key !== 'ability' ? (sentence(earlier.said, telling) ?? []) : []))
  const acting = playing ? abilityShownAt(script.steps, told) : undefined
  const band = acting ? { text: sentence(acting, telling), side: byId(acting.pokemon?.[0])?.side === near ? ('player' as const) : ('foe' as const) } : undefined

  const message = ((): string => {
    if (notice) return notice
    if (playing) return spoken.at(-1) ?? (fight.last.round === 0 ? text.opening : text.round(fight.last.round))
    if (fight.outcome) return text.over[fight.outcome]
    if (gm && refused) return gmText.refused
    if (!actor) return gm ? (toPlay ? gmText.playHint : gmText.waiting) : text.watching
    if (askToMe) return (askToMe.kind === 'run' ? text.askedRun : text.askedSwitch)(nameOf(askToMe.from), actor.name)
    if (refused) return text.refused
    if (fight.takenBack.includes(actor.id)) return text.takenBack(actor.name)
    if (locked?.by === 'timer') return battle.messages.timeout(actor.name)
    if (locked) return text.ready(actor.name)
    if (actor.state === 'gone') return battle.messages.died(actor.name)
    if (actor.state === 'downed') return battle.messages.agonizing(actor.name)
    if (!canChoose) return text.noChoice(actor.name)
    return battle.messages.prompt(actor.name)
  })()

  const plateOf = (fighter: Fighter, side: SceneSide): ReactNode => {
    const status = statusOf(fighter.now.status)
    return (
      <BattlePlate
        side={side}
        letter={fighter.letter}
        name={fighter.name}
        level={fighter.level}
        gender={fighter.gender}
        hp={fighter.now.hp}
        maxHp={fighter.now.maxHp}
        text={battle}
        own={side === 'near' && fighter.id === actorId}
        {...(fighter.changed ? { changed: words.changed } : {})}
        {...(side === 'far' && scene.outOfReach ? { outOfReach: words.outOfReach } : {})}
        {...(fighter.state === 'downed' ? { agony: { stacks: fighter.now.stacks, text: battle.agony, label: battle.agonyLabel(fighter.now.stacks, 3) } } : {})}
      >
        {status && <StatusBadge status={status} text={battle.status[status].badge} label={battle.status[status].name} />}
      </BattlePlate>
    )
  }
  /** One side's Pokémon, at the size the games draw it on that side (decision 277). */
  const battlerOf = (fighter: Fighter | undefined, side: SceneSide): ReactNode =>
    fighter?.species && (
      <Battler cue={cueOf(step?.motion, fighter.id, beat)} species={fighter.species} name={fighter.name} side={side === 'near' ? 'player' : 'foe'} female={fighter.gender === 'F'} pose={fighter.state} scale={spriteScale(side, fighter.species.sprite)} />
    )
  /** A press on a Pokémon in a line of the command screen puts it on the scene, to be looked at (decision 272). The game master then plays it, when it is theirs to play. */
  const look = (id: string): void => {
    const fighter = byId(id)
    if (!fighter) return
    if (gm && playable.includes(id) && fight.outcome === undefined) pick(id)
    else bring(fighter)
  }

  // --- The plan, in its several uses ------------------------------------------
  /** The caption of a line of the plan: the party's, the foes' for a player, the enemies' for the game master who plays them. */
  const captionOf = (side: LineSide): string => (side === 'players' ? words.party : gm ? words.enemies : words.foes)
  const tile = (fighter: Fighter, offered: boolean | undefined): FieldTile => {
    const far = actor !== undefined && fighter.side !== actor.side && !reaches(actor, fighter, fighters)
    const said = [words.slot(fighter.letter, fighter.name), battle.hpLabel(fighter.now.hp, fighter.now.maxHp)]
    if (!gm && fighter.id === actorId) said.push(words.yours)
    if (far) said.push(words.outOfReach)
    if (fighter.changed) said.push(words.changed)
    return {
      id: fighter.id,
      letter: fighter.letter,
      num: fighter.species?.num ?? 0,
      hp: fighter.now.hp,
      maxHp: fighter.now.maxHp,
      state: fighter.state,
      stacks: fighter.now.stacks,
      mine: fighter.id === actorId,
      // While something is being picked, what is not offered is dimmed; otherwise what is out of the played Pokémon's reach is (decision 90).
      ...(offered === undefined ? { outOfReach: far } : { disabled: !offered, open: offered }),
      changed: fighter.changed,
      label: fighter.state === 'gone' ? text.emptySlot(fighter.letter) : said.join(', '),
    }
  }
  /** The two on the scene: the plan frames them. */
  const onScene = [scene.near, scene.far].flatMap((fighter) => fighter?.id ?? [])
  /** The plan, the far line above the near one as on the scene. `offered` says who can be picked, when someone is being picked. */
  const plan = (offered: ((fighter: Fighter) => boolean) | undefined, onSelect: (fighter: Fighter) => void, between: ReactNode, foot: ReactNode): ReactNode => (
    <FieldPlan
      foes={farLine.map((fighter) => tile(fighter, offered?.(fighter)))}
      allies={nearLine.map((fighter) => tile(fighter, offered?.(fighter)))}
      shown={onScene}
      onSelect={(id) => {
        const picked = byId(id)
        if (picked) onSelect(picked)
      }}
      labels={{ foes: captionOf(near === 'players' ? 'enemies' : 'players'), allies: captionOf(near) }}
      ground={between}
    >
      {foot}
    </FieldPlan>
  )
  /** The plan with some Pokémon to pick among, what is asked written between the lines, and the way back. */
  const picker = (hint: string, offered: (fighter: Fighter) => boolean, onPick: (fighter: Fighter) => void, foot?: ReactNode): ReactNode =>
    plan(
      offered,
      onPick,
      <p className="dn-field__hint">{hint}</p>,
      <>
        {foot ?? <span />}
        <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
      </>,
    )

  const timed = fight.timer.seconds !== undefined
  const timerClock = timed ? (
    <span className="dn-timer__clock" aria-hidden="true">
      {clockText(left)}
    </span>
  ) : null
  const timerWords = timed ? `${text.timer(clockText(Math.ceil(left / 10_000) * 10_000))}${fight.timer.running || fight.timer.expired ? '' : `, ${text.timerStopped}`}` : undefined
  const timerClass = `dn-timer${left <= LOW_TIME_MS ? ' dn-timer--low' : ''}`

  const moveName = (id: string): string => moveNameIn(id, wording)
  const actionText = (entry: Locked): string => {
    const said = choiceWords(entry.choice, wording)
    return entry.by === 'self' ? said : `${said} · ${entry.by === 'gm' ? text.action.byGm : text.action.byTimer}`
  }

  // --- The order of the round, one bar a line (decision 248) -------------------
  const bars = orderBars(fight.order, fighters, { near, actor: actorId, playable: new Set(playable), locked: new Set(Object.keys(fight.locked)), away: new Set(gm?.away) })
  const barEntry = (entry: OrderEntry): OrderBarEntry => {
    const said = [...(entry.locked ? [text.orderReady] : []), ...(entry.state === 'downed' ? [text.orderDown] : []), ...(entry.away ? [gmText.awaySaid] : [])]
    return {
      id: entry.id,
      rank: entry.rank,
      // One whose order is not told is known by its place on its line.
      letter: entry.letter,
      num: entry.num,
      label: entry.rank === undefined ? [words.slot(entry.letter, entry.name), ...said].join(', ') : text.orderEntry(entry.rank, entry.name, said),
      locked: entry.locked,
      current: entry.current,
      shown: entry.id === scene.near?.id || entry.id === scene.far?.id,
      down: entry.state === 'downed',
    }
  }
  const namesOf = (bar: readonly OrderEntry[]): string => bar.map((entry) => `${entry.rank ?? entry.letter} ${entry.name}`).join(', ')

  const level = pingLevel(latency)
  const strip = (
    <TopStrip
      clock={clock}
      ping={{ level, text: latency === undefined ? battle.strip.noPing : battle.strip.ping(latency), label: latency === undefined || level === 'none' ? battle.strip.pingLabel.none : battle.strip.pingLabel[level](latency) }}
      battery={battery && { ...battery, text: battle.strip.battery(battery.percent), label: battle.strip.batteryLabel(battery.percent, battery.charging) }}
    />
  )

  // --- The touch screen -----------------------------------------------------
  const partyLine = fighters.filter((fighter) => fighter.side === 'players')
  const ordered = fight.order.flatMap((id) => partyLine.find((fighter) => fighter.id === id) ?? [])

  const roster = (): ReactNode => {
    const others = partyLine.filter((fighter) => !fight.order.includes(fighter.id) && fighter.state !== 'gone')
    const row = (fighter: Fighter, rank: number | undefined): ReactNode => {
      const entry = fight.locked[fighter.id]
      const forced = fight.requests[fighter.id]?.forced
      const doing = entry ? actionText(entry) : fighter.state === 'downed' ? battle.agonyLabel(fighter.now.stacks, 3) : forced ? text.noChoiceShort : text.stillChoosing
      return (
        <li key={fighter.id} className={`dn-roster__row${fighter.id === actorId ? ' dn-roster__row--mine' : ''}`}>
          <span className="dn-roster__rank">{rank ?? fighter.letter}</span>
          <PokemonIcon num={fighter.species?.num ?? 0} scale={0.5} />
          <span className="dn-roster__text">
            <span>{fighter.name}</span>
            <span>{doing}</span>
          </span>
          {entry && <span className="dn-tick" />}
        </li>
      )
    }
    return (
      <div className="dn-roster">
        <p className="dn-roster__title">
          <span>
            {text.round(fight.round)} · {text.order}
          </span>
          {timerClock && (
            <span className={`${timerClass} dn-timer--inline`}>
              <span className="dn-visually-hidden">{timerWords}</span>
              {timerClock}
            </span>
          )}
        </p>
        <ol className="dn-roster__list" aria-label={text.orderLabel(ordered.map((fighter, index) => `${index + 1} ${fighter.name}`).join(', '))} tabIndex={0}>
          {ordered.map((fighter, index) => row(fighter, index + 1))}
          {others.map((fighter) => row(fighter, undefined))}
        </ol>
        <div className="dn-roster__foot">
          <OptionButton onClick={() => show({ at: 'field' })}>{words.battlefield}</OptionButton>
          {locked && canChoose && locked.by !== 'timer' ? (
            <OptionButton primary disabled={pending} onClick={() => ask({ do: 'unlock' })}>
              {text.change}
            </OptionButton>
          ) : canChoose ? (
            <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
          ) : (
            <span />
          )}
        </div>
      </div>
    )
  }

  /** The commands, with the order of the round where the games line up Poké Balls. */
  const commands = (): ReactNode => {
    // The game master's FIGHT is CHANGE once the Pokémon played has locked, and PLAY when nobody has a choice this round.
    const fightWord = toPlay ? gmText.playShort : gm && locked ? gmText.change : battle.commands.fight
    const free = canChoose && !locked && !pending
    const off: CommandId[] = toPlay ? ['bag', 'switch', 'run'] : gm && locked ? (pending ? ['fight', 'bag', 'switch', 'run'] : ['bag', 'switch', 'run']) : free ? [] : ['fight', 'bag', 'switch', 'run']
    // Trading places and Speed is asked of an ally: the game master does it for the enemies, not for a player who is away.
    if (gm && actor?.side === 'players' && !off.includes('run')) off.push('run', 'switch')
    return (
      <CommandMenu
        labels={{ ...battle.commands, fight: fightWord }}
        disabled={off}
        onCommand={(command) => {
          if (command !== 'fight') show({ at: command })
          else if (toPlay) gm.onCommand({ do: 'play' })
          else if (gm && locked) ask({ do: 'unlock' })
          else show({ at: 'moves' })
        }}
        // The line facing over FIGHT, the seat's own under it: a press on a Pokémon of either puts it on the scene (decision 272).
        // A player is not told the foes' order: theirs stand as on their line.
        above={<OrderBar entries={bars.far.map(barEntry)} label={gm ? gmText.partyOrderLabel(namesOf(bars.far)) : text.foesLineLabel(namesOf(bars.far))} onPick={look} />}
        below={<OrderBar entries={bars.near.map(barEntry)} label={gm ? gmText.enemiesOrderLabel(namesOf(bars.near)) : text.orderLabel(namesOf(bars.near))} onPick={look} />}
      >
        {strip}
        <TileButton word={text.wait} side="left" disabled={!free} onClick={() => lockWith({ do: 'wait' })} />
        {gm ? (
          <TileButton word={gmText.tools} side="middle" onClick={() => show({ at: 'tools' })}>
            {timerClock && (
              <span className={`${timerClass} dn-timer--inline`}>
                <span className="dn-visually-hidden">{timerWords}</span>
                {timerClock}
              </span>
            )}
          </TileButton>
        ) : (
          timerClock && (
            <span className={`${timerClass} dn-timer--top`}>
              <span className="dn-visually-hidden">{timerWords}</span>
              {timerClock}
              {!fight.timer.running && !fight.timer.expired && <span>{text.timerStopped}</span>}
            </span>
          )
        )}
        <TileButton word={words.battlefield} onClick={() => show({ at: 'field' })} />
      </CommandMenu>
    )
  }

  /** The items of a Bag that do something in a fight. */
  const usableIn = (bag: readonly { item: string; quantity: number }[]) =>
    bag.flatMap((stack) => {
      const item = pack.items[stack.item]
      return item?.bag ? [{ item, quantity: stack.quantity }] : []
    })

  const touch = ((): { name: string; kind: 'touch' | 'menu'; scrolls?: boolean; ball?: 'open'; content: ReactNode } => {
    // While the round is told: what was said so far, and the way to pass it.
    if (playing) {
      return {
        name: 'told',
        kind: 'menu',
        content: (
          <div className="dn-roster">
            <p className="dn-roster__title">{fight.last.round === 0 ? text.opening : text.round(fight.last.round)}</p>
            <ol className="dn-roster__list dn-roster__list--told" aria-live="off">
              {saidSoFar.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ol>
            {/* The round is passed from here: nothing on the top screen is pressed (decision 272). */}
            <div className="dn-roster__foot">
              <OptionButton onClick={skip}>{text.skip}</OptionButton>
              <OptionButton primary onClick={advance}>
                {text.nextStep}
              </OptionButton>
            </div>
          </div>
        ),
      }
    }
    if (askToMe) {
      const reply = (accept: boolean): void => {
        ask({ do: 'answer', kind: askToMe.kind, from: askToMe.from, accept })
        show(HOME)
      }
      return {
        name: 'ask',
        kind: 'menu',
        content: (
          <div className="dn-ask">
            <p className="dn-ask__text">{message}</p>
            <div className="dn-ask__answers">
              <OptionButton primary disabled={pending} onClick={() => reply(true)}>
                {text.accept}
              </OptionButton>
              <OptionButton disabled={pending} onClick={() => reply(false)}>
                {text.refuse}
              </OptionButton>
            </div>
          </div>
        ),
      }
    }

    switch (view.at) {
      case 'home':
      case 'party':
        // For a player with nothing to choose, or once locked, the touch screen is the party's list (decision 149).
        if (!gm && (view.at === 'party' || !canChoose || locked)) return { name: 'party', kind: 'menu', content: roster() }
        return { name: 'home', kind: 'touch', content: commands() }
      case 'moves':
        return {
          name: 'moves',
          kind: 'touch',
          // The ball opens over the moves, as the games' does (decision 259).
          ball: 'open',
          content: (
            <div className="dn-moves">
              {strip}
              <div className="dn-moves__grid">
                {(request?.moves ?? []).map((option) => {
                  const data = pack.moves[option.id]
                  const type = data?.type ?? 'Normal'
                  const category = data?.category ?? 'Physical'
                  return (
                    <MoveButton
                      key={option.id}
                      name={moveName(option.id)}
                      type={type}
                      typeLabel={pack.types[type.toLowerCase()]?.name[language] ?? type}
                      category={category}
                      categoryLabel={battle.category[category]}
                      pp={option.pp}
                      maxPp={option.maxPp}
                      ppText={battle.pp}
                      // A move with nobody in its reach cannot be locked (decision 69).
                      disabled={option.disabled || (option.needsTarget && option.targets.length === 0)}
                      onSelect={() => {
                        if (option.id === 'allyswitch') show({ at: 'allySwitch' })
                        else if (option.needsTarget) show({ at: 'target', move: option.id })
                        else chooseMove({ move: option.id })
                      }}
                    />
                  )
                })}
              </div>
              {/* The game master's own: an enemy's extra moves, lined up before the move that locks them (decisions 30 and 61). */}
              {gm && actor?.side === 'enemies' && (
                <div className="dn-moves__foot">
                  {/* On one line: several moves lined up go by, as a long name does (decision 254). */}
                  <p className="dn-note">
                    <ScrollingText text={mine.addingExtra ? gmText.addingExtra : `${gmText.extra}: ${extras.length === 0 ? gmText.noExtra : extras.map((move) => moveWords(move, wording)).join(' + ')}`} still={reduced} />
                  </p>
                  {mine.addingExtra ? (
                    <OptionButton onClick={() => setKept({ ...mine, addingExtra: false })}>{gmText.cancel}</OptionButton>
                  ) : (
                    <OptionButton onClick={() => setKept({ ...mine, addingExtra: true })}>{gmText.addExtra}</OptionButton>
                  )}
                  {extras.length > 0 && !mine.addingExtra && <OptionButton onClick={() => setKept({ ...mine, extras: { ...mine.extras, [actor.id]: extrasStep(extras, { do: 'removeLast' }) } })}>{gmText.removeExtra}</OptionButton>}
                </div>
              )}
              {/* The Pokémon of a player who is away may be given Struggle (decision 16). */}
              {gm && actor?.side === 'players' && (
                <div className="dn-moves__foot">
                  <OptionButton onClick={() => lockWith({ do: 'struggle' })}>{gmText.struggle}</OptionButton>
                </div>
              )}
              {/* The way back is the games' own: RUN's tile, with the app's word on it (decision 261). */}
              <TileButton word={battle.back} edge="bottom" tone="run" onClick={() => show(HOME)} />
            </div>
          ),
        }
      case 'target': {
        const targets = request?.moves.find((option) => option.id === view.move)?.targets ?? []
        return {
          name: view.at,
          kind: 'menu',
          content: picker(
            text.target(moveName(view.move)),
            (fighter) => targets.includes(fighter.id),
            (fighter) => chooseMove({ move: view.move, target: fighter.id }),
          ),
        }
      }
      case 'allySwitch': {
        const { first } = view
        return {
          name: view.at,
          kind: 'menu',
          content: picker(
            first ? text.allySwitchSecond : text.allySwitchFirst,
            (fighter) => fighter.side === actor?.side && fighter.state === 'standing' && fighter.id !== first,
            (fighter) => {
              if (first) chooseMove({ move: 'allyswitch', allySwitch: [first, fighter.id] })
              else show({ at: 'allySwitch', first: fighter.id })
            },
          ),
        }
      }
      case 'bag': {
        // The enemies share one Bag; a character has its own, and the Bag of a teammate who is downed or dead is open to the party (decision 175).
        const usable = usableIn(actor?.side === 'enemies' ? (gm?.table.enemyBag ?? []) : (fight.bags[actor?.id ?? ''] ?? []))
        const fallen =
          actor?.side === 'players'
            ? partyLine.filter((fighter) => fighter.id !== actor.id && fighter.state !== 'standing').flatMap((fighter) => {
                const theirs = usableIn(fight.bags[fighter.id] ?? [])
                return theirs.length > 0 ? [{ fighter, usable: theirs }] : []
              })
            : []
        const rows = (items: typeof usable, from?: string) =>
          items.map(({ item, quantity }) => (
            <li key={`${from ?? 'own'}/${item.id}`}>
              <button type="button" className="dn-roster__row" onClick={() => show({ at: 'bagTarget', item: item.id, ...(from ? { from } : {}) })}>
                <ItemIconImage icon={item.icon} scale={0.5} />
                <span />
                <span className="dn-roster__text">
                  <span>{text.stack(item.name[language], quantity)}</span>
                  <span>{item.description[language]}</span>
                </span>
              </button>
            </li>
          ))
        return {
          name: view.at,
          kind: 'menu',
          content: (
            <div className="dn-roster">
              <p className="dn-roster__title">{battle.commands.bag}</p>
              {usable.length === 0 && fallen.length === 0 ? (
                <p className="dn-effects__empty">{text.bagEmpty}</p>
              ) : (
                <ul className="dn-roster__list">
                  {rows(usable)}
                  {fallen.map(({ fighter, usable: theirs }) => (
                    <li key={fighter.id} className="dn-roster__group">
                      <p className="dn-roster__title">{text.bagOf(fighter.name)}</p>
                      <ul className="dn-roster__list">{rows(theirs, fighter.id)}</ul>
                    </li>
                  ))}
                </ul>
              )}
              <div className="dn-roster__foot">
                <span />
                <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
              </div>
            </div>
          ),
        }
      }
      case 'bagTarget': {
        const item = pack.items[view.item]
        const oneMove = item?.bag?.restorePp?.scope === 'one'
        return {
          name: view.at,
          kind: 'menu',
          content: picker(
            text.itemTarget(item?.name[language] ?? view.item),
            // Any Pokémon on the field (decision 19); only a revival item does anything for a dead one (decision 171).
            (fighter) => fighter.state !== 'gone' || item?.bag?.revive !== undefined || item?.bag?.reviveAll === true,
            (fighter) => {
              if (oneMove) show({ at: 'bagMove', item: view.item, target: fighter.id, ...(view.from ? { from: view.from } : {}) })
              else lockWith({ do: 'bag', item: view.item, target: fighter.id, ...(view.from ? { from: view.from } : {}) })
            },
          ),
        }
      }
      case 'bagMove': {
        const target = byId(view.target)
        return {
          name: view.at,
          kind: 'menu',
          content: (
            <div className="dn-roster">
              <p className="dn-roster__title">{text.itemMove(pack.items[view.item]?.name[language] ?? view.item)}</p>
              <ul className="dn-roster__list">
                {(target?.now.moves ?? []).map((slot) => (
                  <li key={slot.id}>
                    <button type="button" className="dn-roster__row" onClick={() => lockWith({ do: 'bag', item: view.item, target: view.target, move: slot.id, ...(view.from ? { from: view.from } : {}) })}>
                      <span />
                      <span />
                      <span className="dn-roster__text">
                        <span>{moveName(slot.id)}</span>
                      </span>
                      <span>
                        {battle.pp} {text.sheetPp(slot.pp, slot.maxPp)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="dn-roster__foot">
                <span />
                <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
              </div>
            </div>
          ),
        }
      }
      case 'run':
      case 'switch': {
        const kind = view.at
        if (gm) {
          // An enemy trades places with a neighbour, or Speed with any enemy still standing, at once: nobody is asked (decisions 138 and 153).
          const offered = (fighter: Fighter): boolean =>
            actor !== undefined && fighter.side === actor.side && fighter.id !== actor.id && (kind === 'run' ? Math.abs(fighter.position - actor.position) === 1 && fighter.state !== 'downed' : fighter.state === 'standing')
          return {
            name: view.at,
            kind: 'menu',
            content: picker(kind === 'run' ? gmText.runHint : gmText.speedHint, offered, (fighter) => {
              ask({ do: kind, with: fighter.id })
              show(HOME)
            }),
          }
        }
        const asked = myAsk(kind)
        // Run: any ally but a downed one, a dead one's empty place included. Switch: an ally still standing.
        const offered = (fighter: Fighter): boolean =>
          !asked && !pending && fighter.side === actor?.side && fighter.id !== actor.id && (kind === 'run' ? fighter.state !== 'downed' : fighter.state === 'standing')
        return {
          name: view.at,
          kind: 'menu',
          content: picker(
            asked ? text.asked(nameOf(asked.to)) : kind === 'run' ? text.run : text.switch,
            offered,
            (fighter) => {
              ask({ do: kind, with: fighter.id })
            },
            asked ? (
              <OptionButton
                primary
                disabled={pending}
                onClick={() => {
                  ask({ do: 'withdraw', kind })
                  show(HOME)
                }}
              >
                {text.takeBack}
              </OptionButton>
            ) : undefined,
          ),
        }
      }
      case 'field':
        return {
          name: view.at,
          kind: 'menu',
          content: plan(
            undefined,
            (fighter) => {
              bring(fighter)
              show({ at: 'sheet', id: fighter.id })
            },
            ground.map((label) => <TypeLabel key={label.id} type={label.type} text={label.name} />),
            <>
              <OptionButton primary={effects.length > 0} onClick={() => show({ at: 'effects' })}>
                {words.more} · {effects.length}
              </OptionButton>
              <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
            </>,
          ),
        }
      case 'effects':
        return {
          name: view.at,
          kind: 'menu',
          content: (
            <FieldEffects effects={effects} label={words.effects} empty={words.noEffects}>
              <OptionButton onClick={() => show({ at: 'field' })}>{battle.back}</OptionButton>
            </FieldEffects>
          ),
        }
      case 'sheet': {
        const fighter = byId(view.id)
        if (!fighter) return { name: view.at, kind: 'menu', content: null }
        return {
          name: view.at,
          kind: 'menu',
          content: (
            <FighterSheet pack={pack} fighter={fighter} language={language} messages={messages} onBack={() => show({ at: 'field' })}>
              {/* The game master may play it from its sheet too: its tile on the battlefield is a full-size target. */}
              {gm && playable.includes(fighter.id) && fighter.id !== actorId && (
                <OptionButton primary onClick={() => pick(fighter.id)}>
                  {gmText.playShort}
                </OptionButton>
              )}
            </FighterSheet>
          ),
        }
      }
      case 'tools':
        if (!gm) return { name: 'home', kind: 'touch', content: commands() }
        return {
          name: view.at,
          kind: 'menu',
          scrolls: true,
          content: (
            <ToolsView
              table={gm.table}
              fighters={fighters}
              away={gm.away}
              wording={wording}
              left={left}
              effects={effects}
              played={script.steps.flatMap((told) => (told.said ? (sentence(told.said, telling) ?? []) : []))}
              onCommand={gm.onCommand}
              onPick={pick}
              onEnd={gm.onEnd}
              onSession={gm.onSession}
              sessionLabel={gm.sessionLabel}
              onBack={() => show(HOME)}
            />
          ),
        }
    }
  })()

  return (
    <DualScreen depth={touch.name === 'home' ? 0 : 1}>
      <Screen kind="scene" label={fight.encounter.name}>
        <SceneWorld backdrop={art.backdrop} url={art.url} hour={art.hour} shot={shot}>
          <SceneSpot side="far" id={scene.far?.species ? scene.far.id : undefined} scale={spriteScale('far', scene.far?.species?.sprite)}>
            {battlerOf(scene.far, 'far')}
          </SceneSpot>
          <SceneSpot side="near" id={scene.near?.species ? scene.near.id : undefined} scale={spriteScale('near', scene.near?.species?.sprite)}>
            {battlerOf(scene.near, 'near')}
          </SceneSpot>
        </SceneWorld>
        <ScenePlate side="far" id={scene.far?.id}>
          {scene.far && plateOf(scene.far, 'far')}
        </ScenePlate>
        <ScenePlate side="near" id={scene.near?.id}>
          {scene.near && plateOf(scene.near, 'near')}
        </ScenePlate>
        {band?.text && <AbilityBand key={band.text} text={band.text} side={band.side} />}
        <div className="dn-scene__message">
          <MessageBox text={message} lettersPerSecond={pace.lettersPerSecond} />
        </div>
      </Screen>
      {/* Each thing the touch screen shows is a screen of its own: its pieces fly out and the next ones fly in, as in the games. */}
      <Screen key={`${own} ${touch.name}`} kind={touch.kind} label={battle.commands.fight} scrolls={touch.scrolls ?? false} {...(touch.ball ? { ball: touch.ball } : {})}>
        {touch.content}
      </Screen>
    </DualScreen>
  )
}
