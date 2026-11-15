import { type ReactNode, useState } from 'react'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { Intent, PlayerFight } from '../../shared/protocol/battle'
import type { CharacterDocument } from '../../shared/schema/character'
import {
  Battler,
  CommandMenu,
  CornerButton,
  FieldPlan,
  type FieldTile,
  HudBox,
  ItemIconImage,
  LineBrowser,
  MessageBox,
  MoveButton,
  OptionButton,
  PokemonIcon,
  Screen,
  StatusBadge,
} from '../../ui'
import { FighterSheet, statusOf } from './FighterSheet'
import { type Fighter, clockText, fightersOf, reaches } from './fighters'
import { useCountdown } from './use-countdown'
import { type Wording, choiceWords, moveName as moveNameIn } from './words'

export interface BattleScreenProps {
  pack: DataPack
  /** The fight as the game master's side last told it. */
  fight: PlayerFight
  /** The party's characters: their names, levels and builds. */
  party: readonly CharacterDocument[]
  /** The viewer's own character. */
  me: string
  /** What became of the last intent that was answered. */
  answer?: { id: string; refused?: string } | undefined
  /** Said in the place of everything else while nothing can be asked: the connection dropped, the game master is away. */
  notice?: string | undefined
  onIntent: (intent: Intent) => void
}

type PlayerChoice = Extract<Intent, { do: 'lock' }>['choice']
type Locked = PlayerFight['locked'][string]

/** What the touch screen shows. Everything but `home` is something the player opened. */
type View =
  | { at: 'home' }
  | { at: 'moves' }
  | { at: 'target'; move: string }
  | { at: 'allySwitch'; first?: string }
  | { at: 'bag' }
  | { at: 'bagTarget'; item: string }
  | { at: 'bagMove'; item: string; target: string }
  | { at: 'run' }
  | { at: 'switch' }
  | { at: 'party' }
  | { at: 'field' }
  | { at: 'sheet'; id: string }

const HOME: View = { at: 'home' }
/** Under this much time, the clock turns red. */
const LOW_TIME_MS = 10_000

/**
 * A fight on a player's phone (decisions 87 to 94): the scene on the top
 * screen, one foe and one ally at a time, and on the touch screen whatever
 * the player is doing: the four commands with WAIT, a move and its target,
 * the Bag, Run and Switch with an ally, the party's order with what each has
 * locked, the battlefield and a Pokémon's sheet.
 *
 * It decides nothing: it shows the fight it is given and asks, through
 * `onIntent`, for what the player chose. What it shows changes when the game
 * master's side says so.
 */
export function BattleScreen({ pack, fight, party, me, answer, notice, onIntent }: BattleScreenProps) {
  const language = useLanguage()
  const messages = useMessages()
  const battle = messages.battle
  const words = battle.field
  const text = battle.choosing
  const left = useCountdown(fight.timer)

  // What the player opened lasts for the round it was opened in.
  const [opened, setOpened] = useState<{ round: number; view: View }>({ round: fight.round, view: HOME })
  const view = opened.round === fight.round ? opened.view : HOME
  const show = (next: View): void => {
    setOpened({ round: fight.round, view: next })
  }
  // Which Pokémon of each line is on the scene, and the side the last arrow pressed points to.
  const [scene, setScene] = useState<{ foe?: string; ally?: string; foeFrom: 'side' | 'left' | 'right'; allyFrom: 'side' | 'left' | 'right' }>({ foeFrom: 'side', allyFrom: 'side' })
  // The last answer the player has been told about: a refusal is said until the next thing they ask.
  const [heard, setHeard] = useState<BattleScreenProps['answer']>()
  // What was asked and not yet answered: nothing more is asked meanwhile.
  const [waiting, setWaiting] = useState<{ fight: PlayerFight; answer: BattleScreenProps['answer'] }>()
  const pending = notice !== undefined || (waiting !== undefined && waiting.fight === fight && waiting.answer === answer)

  const fighters = fightersOf(fight, party, pack, language)
  const allies = fighters.filter((fighter) => fighter.side === 'players')
  const foes = fighters.filter((fighter) => fighter.side === 'enemies')
  const byId = (id: string | undefined): Fighter | undefined => fighters.find((fighter) => fighter.id === id)
  const mine = byId(me)
  const request = fight.requests[me]
  const locked = fight.locked[me]
  const canChoose = fight.outcome === undefined && mine !== undefined && request?.canAct === true && request.forced === null && !fight.timer.expired
  const nameOf = (id: string): string => byId(id)?.name ?? id

  const intend = (intent: Intent): void => {
    setHeard(answer)
    setWaiting({ fight, answer })
    onIntent(intent)
    show(HOME)
  }
  const lock = (choice: PlayerChoice): void => {
    intend({ do: 'lock', choice })
  }

  // --- The scene ------------------------------------------------------------
  const onScene = (line: readonly Fighter[], wanted: string | undefined, fallback: Fighter | undefined): Fighter | undefined => {
    const asked = line.find((fighter) => fighter.id === wanted && fighter.state !== 'gone')
    return asked ?? fallback ?? line.find((fighter) => fighter.state !== 'gone')
  }
  const foe = onScene(foes, scene.foe, mine ? foes.find((other) => other.state !== 'gone' && reaches(mine, other, fighters)) : undefined)
  const ally = onScene(allies, scene.ally, mine?.state === 'gone' ? undefined : mine)
  const bring = (fighter: Fighter): void => {
    const now = fighter.side === 'enemies' ? foe : ally
    const from = now && fighter.position < now.position ? 'left' : 'right'
    setScene((current) => (fighter.side === 'enemies' ? { ...current, foe: fighter.id, foeFrom: from } : { ...current, ally: fighter.id, allyFrom: from }))
  }

  const askToMe = view.at === 'home' ? fight.asks.find((ask) => ask.to === me) : undefined
  const myAsk = (kind: 'run' | 'switch') => fight.asks.find((ask) => ask.kind === kind && ask.from === me)

  const message = ((): string => {
    if (notice) return notice
    if (fight.outcome) return text.over[fight.outcome]
    if (!mine) return text.watching
    if (askToMe) return (askToMe.kind === 'run' ? text.askedRun : text.askedSwitch)(nameOf(askToMe.from), mine.name)
    if (answer?.refused && heard !== answer) return text.refused
    if (fight.takenBack.includes(me)) return text.takenBack(mine.name)
    if (locked?.by === 'timer') return battle.messages.timeout(mine.name)
    if (locked) return text.ready(mine.name)
    if (mine.state === 'gone') return battle.messages.died(mine.name)
    if (mine.state === 'downed') return battle.messages.agonizing(mine.name)
    if (!canChoose) return text.noChoice(mine.name)
    return battle.messages.prompt(mine.name)
  })()

  const box = (fighter: Fighter, side: 'foe' | 'player'): ReactNode => {
    const status = statusOf(fighter.now.status)
    return (
      <HudBox
        side={side}
        name={fighter.name}
        level={fighter.level}
        gender={fighter.gender}
        hp={fighter.now.hp}
        maxHp={fighter.now.maxHp}
        text={battle}
        showNumbers={fighter.id === me}
        {...(fighter.changed ? { changed: words.changed } : {})}
        {...(fighter.state === 'downed' ? { agony: { stacks: fighter.now.stacks, text: battle.agony, label: battle.agonyLabel(fighter.now.stacks, 3) } } : {})}
      >
        {status && <StatusBadge status={status} text={battle.status[status].badge} label={battle.status[status].name} />}
      </HudBox>
    )
  }
  const browser = (line: readonly Fighter[], shown: Fighter, side: 'foe' | 'player'): ReactNode => (
    <LineBrowser
      slots={line.map((fighter) => ({ letter: fighter.letter, state: fighter.state, mine: fighter.id === me }))}
      current={line.indexOf(shown)}
      onChange={(index) => {
        const next = line[index]
        if (next) bring(next)
      }}
      labels={words}
      currentLabel={words.slot(shown.letter, shown.name)}
    >
      {box(shown, side)}
    </LineBrowser>
  )

  // --- The plan, in its several uses ------------------------------------------
  const tile = (fighter: Fighter, offered: boolean | undefined): FieldTile => {
    const far = mine !== undefined && fighter.side === 'enemies' && !reaches(mine, fighter, fighters)
    const said = [words.slot(fighter.letter, fighter.name), battle.hpLabel(fighter.now.hp, fighter.now.maxHp)]
    if (fighter.id === me) said.push(words.yours)
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
      mine: fighter.id === me,
      // While something is being picked, what is not offered is dimmed; otherwise what is out of the viewer's reach is (decision 90).
      ...(offered === undefined ? { outOfReach: far } : { disabled: !offered, open: offered }),
      changed: fighter.changed,
      label: fighter.state === 'gone' ? text.emptySlot(fighter.letter) : said.join(', '),
    }
  }
  /** The plan with some Pokémon to pick among, what is asked written between the lines, and the way back. */
  const picker = (hint: string, offered: (fighter: Fighter) => boolean, onPick: (fighter: Fighter) => void, foot?: ReactNode): ReactNode => (
    <FieldPlan
      foes={foes.map((fighter) => tile(fighter, offered(fighter)))}
      allies={allies.map((fighter) => tile(fighter, offered(fighter)))}
      shown={[foe?.id, ally?.id].filter((id) => id !== undefined)}
      onSelect={(id) => {
        const picked = byId(id)
        if (picked) onPick(picked)
      }}
      labels={{ foes: words.foes, allies: words.party }}
      ground={<p className="dn-field__hint">{hint}</p>}
    >
      {foot ?? <span />}
      <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
    </FieldPlan>
  )

  const clock =
    fight.timer.seconds === undefined ? null : (
      <span className={`dn-timer__clock`} aria-hidden="true">
        {clockText(left)}
      </span>
    )
  const timerWords = fight.timer.seconds === undefined ? undefined : `${text.timer(clockText(Math.ceil(left / 10_000) * 10_000))}${fight.timer.running || fight.timer.expired ? '' : `, ${text.timerStopped}`}`
  const timerClass = `dn-timer${left <= LOW_TIME_MS ? ' dn-timer--low' : ''}`

  const wording: Wording = { pack, language, messages, nameOf }
  const moveName = (id: string): string => moveNameIn(id, wording)
  const actionText = (entry: Locked): string => {
    const said = choiceWords(entry.choice, wording)
    return entry.by === 'self' ? said : `${said} · ${entry.by === 'gm' ? text.action.byGm : text.action.byTimer}`
  }

  // --- The touch screen -----------------------------------------------------
  const ordered = fight.order.flatMap((id) => byId(id) ?? [])
  const orderWords = text.orderLabel(ordered.map((fighter, index) => `${index + 1} ${fighter.name}`).join(', '))

  const roster = (): ReactNode => {
    const others = allies.filter((fighter) => !fight.order.includes(fighter.id) && fighter.state !== 'gone')
    const row = (fighter: Fighter, rank: number | undefined): ReactNode => {
      const entry = fight.locked[fighter.id]
      const forced = fight.requests[fighter.id]?.forced
      const doing = entry ? actionText(entry) : fighter.state === 'downed' ? battle.agonyLabel(fighter.now.stacks, 3) : forced ? text.noChoiceShort : text.stillChoosing
      return (
        <li key={fighter.id} className={`dn-roster__row${fighter.id === me ? ' dn-roster__row--mine' : ''}`}>
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
          {clock && (
            <span className={`${timerClass} dn-timer--inline`}>
              <span className="dn-visually-hidden">{timerWords}</span>
              {clock}
            </span>
          )}
        </p>
        <ol className="dn-roster__list" aria-label={orderWords} tabIndex={0}>
          {ordered.map((fighter, index) => row(fighter, index + 1))}
          {others.map((fighter) => row(fighter, undefined))}
        </ol>
        <div className="dn-roster__foot">
          <OptionButton onClick={() => show({ at: 'field' })}>{words.battlefield}</OptionButton>
          {locked && canChoose && locked.by !== 'timer' ? (
            <OptionButton primary disabled={pending} onClick={() => intend({ do: 'unlock' })}>
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

  const touch = ((): { kind: 'touch' | 'menu'; content: ReactNode } => {
    if (askToMe) {
      const reply = (accept: boolean): void => {
        intend({ do: 'answer', kind: askToMe.kind, from: askToMe.from, accept })
      }
      return {
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
      case 'party': {
        // With nothing to choose, or once locked, the touch screen is the party's list.
        if (view.at === 'party' || !canChoose || locked) return { kind: 'menu', content: roster() }
        return {
          kind: 'touch',
          content: (
            <CommandMenu labels={battle.commands} disabled={pending ? ['fight', 'bag', 'run', 'switch'] : []} onCommand={(command) => show({ at: command === 'fight' ? 'moves' : command })}>
              <CornerButton onClick={() => show({ at: 'field' })}>{words.battlefield}</CornerButton>
              <CornerButton side="left" disabled={pending} onClick={() => lock({ do: 'wait' })}>
                {text.wait}
              </CornerButton>
              <button type="button" className="dn-order" aria-label={orderWords} onClick={() => show({ at: 'party' })}>
                <span className="dn-order__title">{text.order}</span>
                {ordered.map((fighter, index) => (
                  <span key={fighter.id} className={`dn-order__entry${fighter.id === me ? ' dn-order__entry--mine' : ''}`}>
                    <span className="dn-order__rank">{index + 1}</span>
                    <PokemonIcon num={fighter.species?.num ?? 0} scale={0.5} />
                    {fight.locked[fighter.id] && <span className="dn-tick" />}
                  </span>
                ))}
              </button>
              {clock && (
                <span className={timerClass}>
                  <span className="dn-visually-hidden">{timerWords}</span>
                  {clock}
                  {!fight.timer.running && !fight.timer.expired && <span>{text.timerStopped}</span>}
                </span>
              )}
            </CommandMenu>
          ),
        }
      }
      case 'moves':
        return {
          kind: 'touch',
          content: (
            <div className="dn-moves">
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
                      else lock({ do: 'move', move: option.id })
                    }}
                  />
                )
              })}
              <span className="dn-moves__back">
                <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
              </span>
            </div>
          ),
        }
      case 'target': {
        const targets = request?.moves.find((option) => option.id === view.move)?.targets ?? []
        return {
          kind: 'menu',
          content: picker(
            text.target(moveName(view.move)),
            (fighter) => targets.includes(fighter.id),
            (fighter) => lock({ do: 'move', move: view.move, target: fighter.id }),
          ),
        }
      }
      case 'allySwitch': {
        const { first } = view
        return {
          kind: 'menu',
          content: picker(
            first ? text.allySwitchSecond : text.allySwitchFirst,
            (fighter) => fighter.side === 'players' && fighter.state === 'standing' && fighter.id !== first,
            (fighter) => {
              if (first) lock({ do: 'move', move: 'allyswitch', allySwitch: [first, fighter.id] })
              else show({ at: 'allySwitch', first: fighter.id })
            },
          ),
        }
      }
      case 'bag': {
        const usable = (fight.bags[me] ?? []).flatMap((stack) => {
          const item = pack.items[stack.item]
          return item?.bag ? [{ item, quantity: stack.quantity }] : []
        })
        return {
          kind: 'menu',
          content: (
            <div className="dn-roster">
              <p className="dn-roster__title">{battle.commands.bag}</p>
              {usable.length === 0 ? (
                <p className="dn-effects__empty">{text.bagEmpty}</p>
              ) : (
                <ul className="dn-roster__list">
                  {usable.map(({ item, quantity }) => (
                    <li key={item.id}>
                      <button type="button" className="dn-roster__row" onClick={() => show({ at: 'bagTarget', item: item.id })}>
                        <ItemIconImage icon={item.icon} scale={0.5} />
                        <span />
                        <span className="dn-roster__text">
                          <span>{text.stack(item.name[language], quantity)}</span>
                          <span>{item.description[language]}</span>
                        </span>
                      </button>
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
          kind: 'menu',
          content: picker(
            text.itemTarget(item?.name[language] ?? view.item),
            // Any Pokémon on the field (decision 19); no item does anything for a dead one.
            (fighter) => fighter.state !== 'gone',
            (fighter) => {
              if (oneMove) show({ at: 'bagMove', item: view.item, target: fighter.id })
              else lock({ do: 'bag', item: view.item, target: fighter.id })
            },
          ),
        }
      }
      case 'bagMove': {
        const target = byId(view.target)
        return {
          kind: 'menu',
          content: (
            <div className="dn-roster">
              <p className="dn-roster__title">{text.itemMove(pack.items[view.item]?.name[language] ?? view.item)}</p>
              <ul className="dn-roster__list">
                {(target?.now.moves ?? []).map((slot) => (
                  <li key={slot.id}>
                    <button type="button" className="dn-roster__row" onClick={() => lock({ do: 'bag', item: view.item, target: view.target, move: slot.id })}>
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
        const ask = myAsk(kind)
        // Run: any ally but a downed one, a dead one's empty place included. Switch: an ally still standing.
        const offered = (fighter: Fighter): boolean =>
          !ask && !pending && fighter.side === 'players' && fighter.id !== me && (kind === 'run' ? fighter.state !== 'downed' : fighter.state === 'standing')
        return {
          kind: 'menu',
          content: picker(
            ask ? text.asked(nameOf(ask.to)) : kind === 'run' ? text.run : text.switch,
            offered,
            (fighter) => {
              setHeard(answer)
              setWaiting({ fight, answer })
              onIntent({ do: kind, with: fighter.id })
            },
            ask ? (
              <OptionButton primary disabled={pending} onClick={() => intend({ do: 'withdraw', kind })}>
                {text.takeBack}
              </OptionButton>
            ) : undefined,
          ),
        }
      }
      case 'field':
        return {
          kind: 'menu',
          content: (
            <FieldPlan
              foes={foes.map((fighter) => tile(fighter, undefined))}
              allies={allies.map((fighter) => tile(fighter, undefined))}
              shown={[foe?.id, ally?.id].filter((id) => id !== undefined)}
              onSelect={(id) => {
                const picked = byId(id)
                if (!picked) return
                bring(picked)
                show({ at: 'sheet', id })
              }}
              labels={{ foes: words.foes, allies: words.party }}
            >
              <span />
              <OptionButton onClick={() => show(HOME)}>{battle.back}</OptionButton>
            </FieldPlan>
          ),
        }
      case 'sheet': {
        const fighter = byId(view.id)
        if (!fighter) return { kind: 'menu', content: null }
        return { kind: 'menu', content: <FighterSheet pack={pack} fighter={fighter} language={language} messages={messages} onBack={() => show({ at: 'field' })} /> }
      }
    }
  })()

  return (
    <>
      <Screen kind="scene" label={fight.encounter.name}>
        {foe && (
          <>
            <div className="dn-scene__spot dn-scene__spot--foe">
              {foe.species && <Battler key={foe.id} species={foe.species} name={foe.name} side="foe" female={foe.gender === 'F'} pose={foe.state} scale={0.9} enterFrom={scene.foeFrom} />}
            </div>
            <div className="dn-scene__box dn-scene__box--foe">{browser(foes, foe, 'foe')}</div>
          </>
        )}
        {ally && (
          <>
            <div className="dn-scene__spot dn-scene__spot--ally">
              {ally.species && <Battler key={ally.id} species={ally.species} name={ally.name} side="player" female={ally.gender === 'F'} pose={ally.state} scale={1.1} enterFrom={scene.allyFrom} />}
            </div>
            <div className="dn-scene__box dn-scene__box--ally">{browser(allies, ally, 'player')}</div>
          </>
        )}
        <div className="dn-scene__message">
          <MessageBox text={message} />
        </div>
      </Screen>
      <Screen kind={touch.kind} label={battle.commands.fight}>
        {touch.content}
      </Screen>
    </>
  )
}
