import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { type HpTone, fillRatio, hpTone } from './meter'
import { CategoryIcon, TypeLabel } from './sprites'

/** Seconds a full HP bar takes to drain; shorter changes take proportionally less. */
const FULL_BAR_SECONDS = 0.9

export interface HpBarProps {
  current: number
  max: number
  /** Spoken description, such as "HP 34 of 120". */
  label: string
}

/**
 * An HP bar. It drains or fills at a steady pace and changes colour as it
 * crosses half and a fifth, as in the games.
 */
export function HpBar({ current, max, label }: HpBarProps) {
  const target = fillRatio(current, max)
  const reduced = useReducedMotion()
  const ratio = useMotionValue(target)
  const fill = useRef<HTMLSpanElement>(null)
  const [tone, setTone] = useState<HpTone>(hpTone(current, max))

  useMotionValueEvent(ratio, 'change', (value) => {
    if (fill.current) fill.current.style.transform = `scaleX(${value})`
    setTone(hpTone(value, 1))
  })

  useEffect(() => {
    const distance = Math.abs(ratio.get() - target)
    const controls = animate(ratio, target, { duration: reduced ? 0 : FULL_BAR_SECONDS * distance, ease: 'linear' })
    return () => controls.stop()
  }, [ratio, target, reduced])

  return (
    <span className="dn-meter" data-tone={tone} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current}>
      <span ref={fill} className="dn-meter__fill" style={{ transform: `scaleX(${ratio.get()})` }} />
    </span>
  )
}

export interface ExpBarProps {
  /** Share of the way to the next level, from 0 to 1. */
  progress: number
  label: string
}

export function ExpBar({ progress, label }: ExpBarProps) {
  const clamped = Math.min(1, Math.max(0, progress))
  return (
    <span className="dn-meter dn-meter--exp" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped * 100)}>
      <span className="dn-meter__fill" style={{ transform: `scaleX(${clamped})` }} />
    </span>
  )
}

export interface AbilityBandProps {
  /** The Pokémon and its Ability, in the words of the games' band. */
  text: string
  /** Whose Ability it is: the band comes in from that side of the scene, the foes' from the right, the party's from the left. */
  side: 'player' | 'foe'
}

/** The band that names an Ability when it acts. It is read out once, like a line of the message band. */
export function AbilityBand({ text, side }: AbilityBandProps) {
  return (
    <p className={`dn-ability dn-ability--${side} dn-text-shadow`} role="status">
      {text}
    </p>
  )
}

export type StatusId = 'psn' | 'tox' | 'brn' | 'par' | 'slp' | 'frz'

export interface StatusBadgeProps {
  status: StatusId
  /** The badge's letters, in the app's language. */
  text: string
  /** The condition's full name, for assistive technology. */
  label: string
}

export function StatusBadge({ status, text, label }: StatusBadgeProps) {
  return (
    <span className="dn-status" data-status={status} role="img" aria-label={label}>
      {text}
    </span>
  )
}

export interface AgonyBadgeProps {
  /** Stacks left, from 0 to `of`. */
  stacks: number
  of?: number
  /** The badge's word, in the app's language. */
  text: string
  /** Spoken description, such as "Agonizing, 2 of 3 left". */
  label: string
}

/** Denborn's own badge for a downed Pokémon: the Agony stacks it has left, shown as pips. */
export function AgonyBadge({ stacks, of = 3, text, label }: AgonyBadgeProps) {
  return (
    <span className="dn-agony" role="img" aria-label={label}>
      {text}
      {Array.from({ length: of }, (_, index) => (
        <span key={index} className={`dn-agony__pip${index < stacks ? '' : ' dn-agony__pip--spent'}`} />
      ))}
    </span>
  )
}

/** Turns rows of `#` and `.` into the outline of their filled squares. */
function bitmapPath(rows: readonly string[]): string {
  return rows.flatMap((row, y) => Array.from({ length: row.length }, (_, x) => (row[x] === '#' ? `M${x} ${y}h1v1h-1z` : ''))).join('')
}

// Drawn for Denborn on a 6 × 8 grid, in the manner of the games' marks.
const GENDER_MARKS = {
  M: bitmapPath(['...###', '....##', '...#.#', '.###..', '#...#.', '#...#.', '#...#.', '.###..']),
  F: bitmapPath(['.###..', '#...#.', '#...#.', '#...#.', '.###..', '..#...', '.###..', '..#...']),
}

function GenderMark({ gender, label }: { gender: 'M' | 'F'; label: string }) {
  return (
    <svg className={`dn-hud__gender dn-hud__gender--${gender.toLowerCase()}`} viewBox="-1 -1 8 10" role="img" aria-label={label} shapeRendering="crispEdges">
      <path d={GENDER_MARKS[gender]} fill="currentColor" stroke="var(--dn-ink-soft)" strokeWidth="2" strokeLinejoin="miter" paintOrder="stroke" />
    </svg>
  )
}

export interface HudBoxProps {
  /** `foe` mirrors the box for the enemy line. */
  side: 'player' | 'foe'
  name: string
  level: number
  gender: 'M' | 'F' | 'N'
  hp: number
  maxHp: number
  /** Words that change with the language. */
  text: {
    level: string
    hp: string
    hpLabel: (hp: number, max: number) => string
    gender: { M: string; F: string }
  }
  /** Whether to print the HP as numbers under the bar. */
  showNumbers?: boolean
  /** For a downed Pokémon: its Agony stacks, shown in the HP bar's place (decision 83). */
  agony?: AgonyBadgeProps
  /** Set when the Pokémon carries stat changes or effects of its own: the words that say so. A small mark shows. */
  changed?: string
  /** Status badges. */
  children?: ReactNode
}

/**
 * One Pokémon's name, level and HP during a battle: the name and level stand
 * on the scene, the badges and the HP bar on the dark plate. A downed Pokémon
 * has no HP to show: its Agony badge takes the bar's place.
 */
export function HudBox({ side, name, level, gender, hp, maxHp, text, showNumbers = false, agony, changed, children }: HudBoxProps) {
  return (
    <div className={`dn-hud dn-hud--${side}`}>
      <span className="dn-hud__title dn-text-outline">
        <span className="dn-hud__name">{name}</span>
        {gender !== 'N' && <GenderMark gender={gender} label={text.gender[gender]} />}
        <span>
          <span className="dn-hud__label">{text.level}</span>
          {level}
        </span>
      </span>
      <span className="dn-hud__plate">
        <span className="dn-hud__back" aria-hidden="true" />
        <span className="dn-hud__states">
          {children}
          {changed && <span className="dn-changes" role="img" aria-label={changed} />}
        </span>
        {agony ? (
          <span className="dn-hud__instead">
            <AgonyBadge {...agony} />
          </span>
        ) : (
          <>
            <span className="dn-hud__label" aria-hidden="true">
              {text.hp}
            </span>
            <HpBar current={hp} max={maxHp} label={text.hpLabel(hp, maxHp)} />
          </>
        )}
        {showNumbers && !agony && (
          <span className="dn-hud__numbers" aria-hidden="true">
            {hp}/{maxHp}
          </span>
        )}
      </span>
    </div>
  )
}

export interface MoveButtonProps {
  name: string
  /** The type's English name, as in the data pack: it picks the colours. */
  type: string
  /** The type's name in the app's language, shown on its label. */
  typeLabel: string
  category: 'Physical' | 'Special' | 'Status'
  categoryLabel: string
  pp: number
  maxPp: number
  /** The letters before the PP count. */
  ppText: string
  selected?: boolean
  disabled?: boolean
  onSelect: () => void
}

/** One of a Pokémon's six moves: its name, type, category and PP, on its type's colour. */
export function MoveButton(props: MoveButtonProps) {
  const type = props.type.toLowerCase()
  const style = {
    '--dn-move-fill': `var(--dn-type-${type})`,
    '--dn-move-shade': `var(--dn-type-${type}-shade)`,
  } as CSSProperties
  return (
    <button type="button" className="dn-move" style={style} aria-pressed={props.selected ?? false} disabled={props.disabled} onClick={props.onSelect}>
      <span className="dn-move__name">{props.name}</span>
      <span className="dn-move__tags">
        <TypeLabel type={props.type} text={props.typeLabel} />
        <CategoryIcon category={props.category} label={props.categoryLabel} compact scale={0.8} />
      </span>
      <span className="dn-move__pp">
        {props.ppText} {props.pp}/{props.maxPp}
      </span>
    </button>
  )
}

/** Letters shown per second (Denborn's choice: the games' speeds are not documented). */
const LETTERS_PER_SECOND = 45

export interface MessageBoxProps {
  text: string
  /** Called when the reader asks for what comes next. Without it the box only shows text. */
  onAdvance?: () => void
  /** Spoken name of the "next" action. */
  advanceLabel?: string
  /** How many letters appear each second: the player's text speed. 45 when left out. */
  lettersPerSecond?: number
}

/**
 * The battle's message band. Text appears letter by letter; a tap, Enter or
 * Space shows it all at once, and once it is all there asks for the next one.
 */
export function MessageBox({ text, onAdvance, advanceLabel, lettersPerSecond = LETTERS_PER_SECOND }: MessageBoxProps) {
  const reduced = useReducedMotion()
  // Restart the count whenever the text changes, without an effect.
  const [typed, setTyped] = useState({ text, shown: 0 })
  const shown = typed.text === text ? typed.shown : 0
  const done = Boolean(reduced) || shown >= text.length

  useEffect(() => {
    if (done) return
    const timer = setInterval(() => {
      setTyped((state) => ({ text, shown: (state.text === text ? state.shown : 0) + 1 }))
    }, 1000 / lettersPerSecond)
    return () => clearInterval(timer)
  }, [text, done, lettersPerSecond])

  const advance = (): void => {
    if (!done) setTyped({ text, shown: text.length })
    else onAdvance?.()
  }

  const body = (
    <>
      {/* Read out whole and at once; the letter-by-letter display is for the eyes only. */}
      <span className="dn-visually-hidden" role="status">
        {text}
      </span>
      <span aria-hidden="true">{done ? text : text.slice(0, shown)}</span>
      {done && onAdvance && <span className="dn-message__more" aria-hidden="true" />}
    </>
  )
  if (!onAdvance) return <div className="dn-message dn-text-shadow">{body}</div>
  return (
    // Named by its message, then by what a press does: a name that left the visible words out could not be spoken to.
    <button type="button" className="dn-message dn-text-shadow" onClick={advance}>
      {body}
      <span className="dn-visually-hidden">{advanceLabel}</span>
    </button>
  )
}
