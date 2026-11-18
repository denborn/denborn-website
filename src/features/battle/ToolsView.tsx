import type { ReactNode } from 'react'
import { useMessages } from '../../i18n'
import { type FieldEffect, NumberField, OptionButton, PokemonIcon, Slot, StepHeader } from '../../ui'
import type { FightCommand, TableView } from './fight'
import { type Fighter, clockText } from './fighters'
import { type Wording, choiceWords, moveWords } from './words'

export interface ToolsViewProps {
  /** The whole table, as only the game master is shown it. */
  table: TableView
  /** Everyone on the field, as the screens draw them. */
  fighters: readonly Fighter[]
  /** The characters whose player is away right now. */
  away: readonly string[]
  wording: Wording
  /** Milliseconds left on the timer. */
  left: number
  /** Everything in effect on the battlefield. */
  effects: readonly FieldEffect[]
  /** The last round, in the words the players were told it with. */
  played: readonly string[]
  onCommand: (command: Extract<FightCommand, { do: 'timer' | 'pause' | 'resume' | 'play' }>) => void
  /** Picks a Pokémon to play, and goes back to the commands. */
  onPick: (id: string) => void
  onEnd: () => void
  onSession: () => void
  sessionLabel: string
  onBack: () => void
}

/** The timer the game master turns on (decision 150), and the lengths it can be given. */
const TIMER_SECONDS = 60
const TIMER_MIN = 10
const TIMER_MAX = 300

/**
 * TOOLS, the game master's own part of a fight's touch screen (decision 250):
 * the timer (on, off, paused, its seconds), the encounter as it stands (each
 * enemy with its class and what it has locked, each player's Pokémon and
 * whether its player is away), the order of everyone, what is in effect, the
 * last round as it was told, and the ways out: playing a round nobody has a
 * choice in, ending the encounter, the rest of the session.
 */
export function ToolsView({ table, fighters, away, wording, left, effects, played, onCommand, onPick, onEnd, onSession, sessionLabel, onBack }: ToolsViewProps) {
  const messages = useMessages()
  const battle = messages.battle
  const text = battle.console
  const choosing = battle.choosing
  const { timer } = table
  const foes = fighters.filter((fighter) => fighter.side === 'enemies')
  const allies = fighters.filter((fighter) => fighter.side === 'players')
  const order = table.order.flatMap((id) => fighters.find((fighter) => fighter.id === id) ?? []).map((fighter, index) => `${index + 1} ${fighter.name}`)

  /** What a Pokémon is doing this round, and the word that says it is waited on. */
  const doing = (fighter: Fighter): { said: string; tag?: string } => {
    const entry = table.locked[fighter.id]
    if (fighter.state === 'gone') return { said: text.gone }
    if (fighter.state === 'downed') return { said: `${text.down} · ${battle.agonyLabel(fighter.now.stacks, 3)}` }
    if (entry) return { said: [choiceWords(entry.choice, wording), ...entry.extra.map((move) => moveWords(move, wording))].join(' + ') }
    if (table.requests[fighter.id]?.forced) return { said: text.noChoice }
    if (fighter.side === 'enemies') return { said: text.state(fighter.now.hp, fighter.now.maxHp), tag: text.toChoose }
    return { said: choosing.stillChoosing, ...(away.includes(fighter.id) ? { tag: text.away } : {}) }
  }
  const row = (fighter: Fighter): ReactNode => {
    const { said, tag } = doing(fighter)
    const mobClass = table.classes[fighter.id]
    // An enemy's class is the game master's own label (decision 133); its HP is in numbers here, for them alone.
    const facts = [mobClass ? messages.encounters.enemy.classes[mobClass] : undefined, fighter.state === 'gone' ? undefined : text.state(fighter.now.hp, fighter.now.maxHp), said === text.state(fighter.now.hp, fighter.now.maxHp) ? undefined : said]
    // The game master plays the enemies, and the Pokémon of a player who is away.
    const mine = fighter.side === 'enemies' || away.includes(fighter.id)
    return (
      <Slot key={fighter.id} state={table.locked[fighter.id] ? 'ok' : fighter.state === 'downed' ? 'down' : 'normal'} disabled={fighter.state === 'gone' || !mine} onClick={() => onPick(fighter.id)}>
        <PokemonIcon num={fighter.species?.num ?? 0} />
        <span className="dn-slot__text">
          <span className="dn-text-shadow">
            {fighter.letter} · {fighter.name}
          </span>
          <span className="dn-note">{facts.filter((fact) => fact !== undefined).join(' · ')}</span>
        </span>
        {tag && <span className="dn-slot__side dn-slot__tag">{tag}</span>}
      </Slot>
    )
  }

  return (
    <>
      <StepHeader title={`${table.encounter.name} · ${choosing.round(table.round)}`} />
      <div className="dn-stack">
        {table.outcome && (
          <p className="dn-note" role="status">
            {choosing.over[table.outcome]}
          </p>
        )}
        {timer.seconds === undefined ? (
          <>
            <p className="dn-note">{text.timerOff}</p>
            <div className="dn-row">
              <OptionButton onClick={() => onCommand({ do: 'timer', seconds: TIMER_SECONDS })}>{text.timerOn}</OptionButton>
            </div>
          </>
        ) : (
          <>
            <NumberField label={text.seconds} value={timer.seconds} min={TIMER_MIN} max={TIMER_MAX} onChange={(seconds) => onCommand({ do: 'timer', seconds })} lowerLabel={text.lowerSeconds} raiseLabel={text.raiseSeconds} />
            <p className="dn-note">{timer.expired ? text.timeUp : choosing.timer(clockText(left))}</p>
            <div className="dn-row">
              <OptionButton disabled={timer.expired} onClick={() => onCommand({ do: table.paused ? 'resume' : 'pause' })}>
                {table.paused ? text.resume : text.pause}
              </OptionButton>
              <OptionButton onClick={() => onCommand({ do: 'timer', seconds: undefined })}>{text.timerStop}</OptionButton>
            </div>
          </>
        )}
        <span className="dn-label">{text.enemies}</span>
        {foes.map(row)}
        <span className="dn-label">{text.party}</span>
        {allies.map(row)}
        <p className="dn-note">{text.order(order.join(', '))}</p>
        {effects.length > 0 && (
          <>
            <span className="dn-label">{battle.field.effects}</span>
            <ul className="dn-list">
              {effects.map((effect) => (
                <li key={effect.id} className="dn-note">
                  {[effect.name, effect.lasting, effect.scopeText].filter((part) => part !== undefined).join(' · ')}
                </li>
              ))}
            </ul>
          </>
        )}
        {played.length > 0 && (
          <>
            <span className="dn-label">{text.played(table.last.round)}</span>
            <ol className="dn-list">
              {played.map((line, index) => (
                <li key={index} className="dn-note">
                  {line}
                </li>
              ))}
            </ol>
          </>
        )}
        {table.ready && (
          <>
            <p className="dn-note">{text.playHint}</p>
            <div className="dn-row">
              <OptionButton primary onClick={() => onCommand({ do: 'play' })}>
                {text.play}
              </OptionButton>
            </div>
          </>
        )}
        <div className="dn-row">
          <OptionButton primary={table.outcome !== undefined} onClick={onEnd}>
            {text.end}
          </OptionButton>
        </div>
        <div className="dn-row">
          <OptionButton onClick={onSession}>{sessionLabel}</OptionButton>
        </div>
      </div>
      <div className="dn-foot">
        <OptionButton primary onClick={onBack}>
          {battle.back}
        </OptionButton>
      </div>
    </>
  )
}
