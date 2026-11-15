import { type ReactNode, useState } from 'react'
import type { MoveChoice } from '../../battle/contract'
import type { DataPack } from '../../data/types'
import { useLanguage, useMessages } from '../../i18n'
import type { CharacterDocument } from '../../shared/schema/character'
import { FieldPlan, type FieldTile, ItemIconImage, NumberField, OptionButton, PokemonIcon, Screen, Slot, StepHeader, TypeLabel } from '../../ui'
import type { Choice, FightCommand, TableView } from './fight'
import { type Fighter, clockText, fightersOf } from './fighters'
import { useCountdown } from './use-countdown'
import { type Wording, choiceWords, moveName, moveWords } from './words'

export interface GmConsoleProps {
  pack: DataPack
  /** The whole table, as only the game master sees it. */
  table: TableView
  /** The characters in the fight: their names, levels and builds. */
  party: readonly CharacterDocument[]
  /** The characters whose player is away right now: the game master may choose for them (decision 16). */
  away: readonly string[]
  /** Carries a command out, and gives back why it changed nothing when it did not. */
  onCommand: (command: FightCommand) => string | undefined
  /** Under the fight: the way to the rest of the session. */
  children?: ReactNode
}

/** What is being picked on the plan, for the Pokémon that is open. */
type Picking =
  | { what: 'target'; move: string }
  | { what: 'allySwitch'; first?: string }
  | { what: 'bagTarget'; item: string }
  | { what: 'bagMove'; item: string; target: string }
  | { what: 'speed' }

/** The timer the game master turns on (decision 150), and the lengths it can be given. */
const TIMER_SECONDS = 60
const TIMER_MIN = 10
const TIMER_MAX = 300

/**
 * The game master's console during a fight: the battlefield on the top
 * screen, and below it the round as it stands: each enemy and what it has
 * locked, each player's Pokémon and what it has locked, the order, the timer.
 * A tap on a Pokémon opens it: an enemy is given its move, its extra moves,
 * an item of the enemies' Bag or WAIT, is moved along its line or exchanges
 * Speed; the Pokémon of a player who is away can be chosen for. Whatever
 * takes a target is aimed on the battlefield above.
 */
export function GmConsole({ pack, table, party, away, onCommand, children }: GmConsoleProps) {
  const language = useLanguage()
  const messages = useMessages()
  const battle = messages.battle
  const text = battle.console
  const choosing = battle.choosing
  const left = useCountdown(table.timer)

  // What is open, the extra moves being lined up and the last refusal belong to the round they were made in.
  const [kept, setKept] = useState<{ round: number; open?: string; picking?: Picking; addingExtra: boolean; extras: Record<string, MoveChoice[]>; refused: boolean }>({ round: table.round, addingExtra: false, extras: {}, refused: false })
  const state = kept.round === table.round ? kept : { round: table.round, addingExtra: false, extras: {}, refused: false }
  const set = (changes: Partial<typeof kept>): void => {
    setKept({ ...state, ...changes })
  }

  const fighters = fightersOf(table, party, pack, language)
  const foes = fighters.filter((fighter) => fighter.side === 'enemies')
  const allies = fighters.filter((fighter) => fighter.side === 'players')
  const byId = (id: string | undefined): Fighter | undefined => fighters.find((fighter) => fighter.id === id)
  const wording: Wording = { pack, language, messages, nameOf: (id) => byId(id)?.name ?? id }
  const open = byId(state.open)
  const { picking } = state
  const extrasOf = (id: string): MoveChoice[] => state.extras[id] ?? []

  const send = (command: FightCommand, then: Partial<typeof kept> = {}): void => {
    const refused = onCommand(command) !== undefined
    set({ ...then, refused, ...(refused ? {} : { picking: undefined, addingExtra: false }) })
  }
  /** A move chosen for the open Pokémon: one more extra move while one is being added, its locked action otherwise. */
  const chooseMove = (who: Fighter, move: MoveChoice): void => {
    if (state.addingExtra) set({ extras: { ...state.extras, [who.id]: [...extrasOf(who.id), move] }, addingExtra: false, picking: undefined })
    else lock(who, { do: 'move', ...move })
  }
  const lock = (who: Fighter, choice: Choice): void => {
    send({ do: 'lock', who: who.id, choice, extra: who.side === 'enemies' ? extrasOf(who.id) : [] })
  }

  // --- The battlefield, on the top screen ------------------------------------
  const request = open ? table.requests[open.id] : undefined
  const offered = (fighter: Fighter): boolean => {
    if (!open || !picking) return true
    switch (picking.what) {
      case 'target':
        return request?.moves.find((option) => option.id === picking.move)?.targets.includes(fighter.id) ?? false
      case 'allySwitch':
        return fighter.side === open.side && fighter.state === 'standing' && fighter.id !== picking.first
      case 'bagTarget':
        return fighter.state !== 'gone'
      case 'speed':
        return fighter.side === open.side && fighter.state === 'standing' && fighter.id !== open.id
      case 'bagMove':
        return false
    }
  }
  const pick = (fighter: Fighter): void => {
    if (!open || !picking) {
      set({ open: fighter.id, picking: undefined, addingExtra: false })
      return
    }
    switch (picking.what) {
      case 'target':
        chooseMove(open, { move: picking.move, target: fighter.id })
        return
      case 'allySwitch':
        if (picking.first) chooseMove(open, { move: 'allyswitch', allySwitch: [picking.first, fighter.id] })
        else set({ picking: { what: 'allySwitch', first: fighter.id } })
        return
      case 'bagTarget':
        if (pack.items[picking.item]?.bag?.restorePp?.scope === 'one') set({ picking: { what: 'bagMove', item: picking.item, target: fighter.id } })
        else lock(open, { do: 'bag', item: picking.item, target: fighter.id })
        return
      case 'speed':
        send({ do: 'switch', who: open.id, with: fighter.id })
        return
      case 'bagMove':
    }
  }
  const hint = ((): string => {
    if (!picking) return `${choosing.round(table.round)}${table.timer.seconds === undefined ? '' : ` · ${clockText(left)}`}`
    switch (picking.what) {
      case 'target':
        return choosing.target(moveName(picking.move, wording))
      case 'allySwitch':
        return picking.first ? choosing.allySwitchSecond : choosing.allySwitchFirst
      case 'bagTarget':
        return choosing.itemTarget(pack.items[picking.item]?.name[language] ?? picking.item)
      case 'bagMove':
        return choosing.itemMove(pack.items[picking.item]?.name[language] ?? picking.item)
      case 'speed':
        return text.speedHint
    }
  })()
  const tile = (fighter: Fighter): FieldTile => ({
    id: fighter.id,
    letter: fighter.letter,
    num: fighter.species?.num ?? 0,
    hp: fighter.now.hp,
    maxHp: fighter.now.maxHp,
    state: fighter.state,
    stacks: fighter.now.stacks,
    changed: fighter.changed,
    ...(picking ? { disabled: !offered(fighter) } : {}),
    label: [battle.field.slot(fighter.letter, fighter.name), battle.hpLabel(fighter.now.hp, fighter.now.maxHp)].join(', '),
  })

  // --- A row for each Pokémon -------------------------------------------------
  const doing = (fighter: Fighter): { said: string; tag?: string } => {
    const entry = table.locked[fighter.id]
    if (fighter.state === 'gone') return { said: text.gone }
    if (fighter.state === 'downed') return { said: `${text.down} · ${battle.agonyLabel(fighter.now.stacks, 3)}` }
    if (entry) {
      const extra = entry.extra.map((move) => moveWords(move, wording))
      return { said: [choiceWords(entry.choice, wording), ...extra].join(' + ') }
    }
    if (table.requests[fighter.id]?.forced) return { said: text.noChoice }
    if (fighter.side === 'enemies') return { said: text.state(fighter.now.hp, fighter.now.maxHp), tag: text.toChoose }
    return { said: choosing.stillChoosing, ...(away.includes(fighter.id) ? { tag: text.away } : {}) }
  }
  const row = (fighter: Fighter): ReactNode => {
    const { said, tag } = doing(fighter)
    return (
      <Slot key={fighter.id} state={table.locked[fighter.id] ? 'ok' : fighter.state === 'downed' ? 'down' : 'normal'} disabled={fighter.state === 'gone'} onClick={() => set({ open: fighter.id, picking: undefined, addingExtra: false })}>
        <PokemonIcon num={fighter.species?.num ?? 0} />
        <span className="dn-slot__text">
          <span className="dn-text-shadow">
            {fighter.letter} · {fighter.name}
          </span>
          <span className="dn-note">{said}</span>
        </span>
        {tag && <span className="dn-slot__side dn-slot__tag">{tag}</span>}
      </Slot>
    )
  }

  /** A Pokémon in one line: an enemy's class (the game master's own label, decision 133), its HP, and what it is doing when that says more. */
  const summary = (fighter: Fighter): string => {
    const mobClass = table.classes[fighter.id]
    const hp = text.state(fighter.now.hp, fighter.now.maxHp)
    const { said } = doing(fighter)
    return [mobClass ? messages.encounters.enemy.classes[mobClass] : undefined, hp, said === hp ? undefined : said].filter((part) => part !== undefined).join(' · ')
  }

  // --- One Pokémon, opened ------------------------------------------------------
  const opened = (fighter: Fighter): ReactNode => {
    const entry = table.locked[fighter.id]
    const mine = fighter.side === 'enemies' || away.includes(fighter.id)
    const line = fighter.side === 'enemies' ? foes : allies
    const neighbour = (step: -1 | 1): Fighter | undefined => line.find((other) => other.position === fighter.position + step)
    const bag = fighter.side === 'enemies' ? table.enemyBag : (table.bags[fighter.id] ?? [])
    const usable = bag.flatMap((stack) => {
      const item = pack.items[stack.item]
      return item?.bag ? [{ item, quantity: stack.quantity }] : []
    })
    const canChoose = table.outcome === undefined && request?.canAct === true && request.forced === null

    if (picking?.what === 'bagMove') {
      const target = byId(picking.target)
      return (target?.now.moves ?? []).map((slot) => (
        <Slot key={slot.id} onClick={() => lock(fighter, { do: 'bag', item: picking.item, target: picking.target, move: slot.id })}>
          <span className="dn-slot__main dn-text-shadow">{moveName(slot.id, wording)}</span>
          <span className="dn-slot__side">{text.pp(slot.pp, slot.maxPp)}</span>
        </Slot>
      ))
    }
    return (
      <>
        <p className="dn-note">{summary(fighter)}</p>
        {!canChoose ? null : !mine ? (
          <p className="dn-note">{text.thereHint}</p>
        ) : entry ? (
          <div className="dn-row">
            <OptionButton onClick={() => send({ do: 'unlock', who: fighter.id })}>{text.change}</OptionButton>
          </div>
        ) : (
          <>
            {fighter.side === 'players' && <p className="dn-note">{text.awayHint}</p>}
            <span className="dn-label">{text.moves}</span>
            {state.addingExtra && <p className="dn-note">{text.addingExtra}</p>}
            {(request.moves).map((option) => {
              const data = pack.moves[option.id]
              return (
                <Slot
                  key={option.id}
                  // A move with nobody in its reach cannot be locked (decision 69).
                  disabled={option.disabled || (option.needsTarget && option.targets.length === 0)}
                  onClick={() => {
                    if (option.id === 'allyswitch') set({ picking: { what: 'allySwitch' } })
                    else if (option.needsTarget) set({ picking: { what: 'target', move: option.id } })
                    else chooseMove(fighter, { move: option.id })
                  }}
                >
                  <span className="dn-slot__text">
                    <span className="dn-slot__line">
                      <span className="dn-slot__main dn-text-shadow">{moveName(option.id, wording)}</span>
                      <span className="dn-slot__side">
                        {data && <TypeLabel type={data.type} text={pack.types[data.type.toLowerCase()]?.name[language] ?? data.type} />}
                        <span className="dn-slot__pp">{text.pp(option.pp, option.maxPp)}</span>
                      </span>
                    </span>
                  </span>
                </Slot>
              )
            })}
            {!state.addingExtra && (
              <div className="dn-row">
                <OptionButton onClick={() => lock(fighter, { do: 'wait' })}>{text.wait}</OptionButton>
                {fighter.side === 'players' && <OptionButton onClick={() => lock(fighter, { do: 'struggle' })}>{text.struggle}</OptionButton>}
              </div>
            )}
            {usable.length > 0 && !state.addingExtra && (
              <>
                <span className="dn-label">{text.bag}</span>
                {usable.map(({ item, quantity }) => (
                  <Slot key={item.id} onClick={() => set({ picking: { what: 'bagTarget', item: item.id } })}>
                    <span className="dn-slot__icon">
                      <ItemIconImage icon={item.icon} />
                    </span>
                    <span className="dn-slot__main dn-text-shadow">{choosing.stack(item.name[language], quantity)}</span>
                  </Slot>
                ))}
              </>
            )}
            {fighter.side === 'enemies' && (
              <>
                <span className="dn-label">{text.extra}</span>
                <p className="dn-note">
                  {extrasOf(fighter.id).length === 0
                    ? text.noExtra
                    : extrasOf(fighter.id)
                        .map((move) => moveWords(move, wording))
                        .join(' + ')}
                </p>
                <div className="dn-row">
                  {state.addingExtra ? (
                    <OptionButton onClick={() => set({ addingExtra: false, picking: undefined })}>{text.cancel}</OptionButton>
                  ) : (
                    <OptionButton onClick={() => set({ addingExtra: true })}>{text.addExtra}</OptionButton>
                  )}
                  {extrasOf(fighter.id).length > 0 && !state.addingExtra && (
                    <OptionButton onClick={() => set({ extras: { ...state.extras, [fighter.id]: extrasOf(fighter.id).slice(0, -1) } })}>{text.removeExtra}</OptionButton>
                  )}
                </div>
                <span className="dn-label">{text.place(fighter.letter, line.length)}</span>
                <div className="dn-row">
                  {([-1, 1] as const).map((step) => {
                    const other = neighbour(step)
                    return (
                      <OptionButton key={step} disabled={!other || other.state === 'downed'} onClick={() => other && send({ do: 'run', who: fighter.id, with: other.id })}>
                        {step < 0 ? text.moveLeft : text.moveRight}
                      </OptionButton>
                    )
                  })}
                </div>
                <div className="dn-row">
                  <OptionButton disabled={!line.some((other) => other.id !== fighter.id && other.state === 'standing')} onClick={() => set({ picking: { what: 'speed' } })}>
                    {text.speed}
                  </OptionButton>
                </div>
              </>
            )}
          </>
        )}
      </>
    )
  }

  const timer = table.timer
  const order = table.order.flatMap((id) => byId(id) ?? []).map((fighter, index) => `${index + 1} ${fighter.name}`)

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="menu" label={battle.field.battlefield}>
          <FieldPlan
            foes={foes.map(tile)}
            allies={allies.map(tile)}
            shown={open ? [open.id] : []}
            onSelect={(id) => {
              const fighter = byId(id)
              if (fighter) pick(fighter)
            }}
            labels={{ foes: battle.field.foes, allies: battle.field.party }}
            ground={<p className="dn-field__hint">{hint}</p>}
          >
            <span />
            {picking ? <OptionButton onClick={() => set({ picking: undefined, addingExtra: false })}>{text.cancel}</OptionButton> : <span />}
          </FieldPlan>
        </Screen>
      </div>
      <Screen kind="menu" label={open?.name ?? table.encounter.name} tall>
        <StepHeader title={open ? `${open.letter} · ${open.name}` : `${table.encounter.name} · ${choosing.round(table.round)}`} />
        <div className="dn-stack">
          {table.outcome && (
            <p className="dn-note" role="status">
              {choosing.over[table.outcome]}
            </p>
          )}
          {state.refused && (
            <p className="dn-note dn-note--error" role="alert">
              {text.refused}
            </p>
          )}
          {open ? (
            opened(open)
          ) : (
            <>
              {timer.seconds === undefined ? (
                <>
                  <p className="dn-note">{text.timerOff}</p>
                  <div className="dn-row">
                    <OptionButton onClick={() => send({ do: 'timer', seconds: TIMER_SECONDS })}>{text.timerOn}</OptionButton>
                  </div>
                </>
              ) : (
                <>
                  <NumberField label={text.seconds} value={timer.seconds} min={TIMER_MIN} max={TIMER_MAX} onChange={(seconds) => send({ do: 'timer', seconds })} lowerLabel={text.lowerSeconds} raiseLabel={text.raiseSeconds} />
                  <p className="dn-note">{timer.expired ? text.timeUp : choosing.timer(clockText(left))}</p>
                  <div className="dn-row">
                    <OptionButton disabled={timer.expired} onClick={() => send({ do: table.paused ? 'resume' : 'pause' })}>
                      {table.paused ? text.resume : text.pause}
                    </OptionButton>
                    <OptionButton onClick={() => send({ do: 'timer', seconds: undefined })}>{text.timerStop}</OptionButton>
                  </div>
                </>
              )}
              <span className="dn-label">{text.enemies}</span>
              {foes.map(row)}
              <span className="dn-label">{text.party}</span>
              {allies.map(row)}
              <p className="dn-note">{text.order(order.join(', '))}</p>
              {table.ready && (
                <>
                  <p className="dn-note">{text.playHint}</p>
                  <div className="dn-row">
                    <OptionButton primary onClick={() => send({ do: 'play' })}>
                      {text.play}
                    </OptionButton>
                  </div>
                </>
              )}
              {children}
            </>
          )}
        </div>
        {open && (
          <div className="dn-foot">
            <OptionButton primary onClick={() => set({ open: undefined, picking: undefined, addingExtra: false })}>
              {text.done}
            </OptionButton>
          </div>
        )}
      </Screen>
    </div>
  )
}
