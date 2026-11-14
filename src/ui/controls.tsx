import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'>

export interface PanelProps {
  /** `dark` is the Black 2 box, `light` the White 2 one. */
  tone?: 'dark' | 'light'
  children?: ReactNode
}

/** A framed box for text and values. */
export function Panel({ tone = 'dark', children }: PanelProps) {
  return <div className={`dn-panel${tone === 'light' ? ' dn-panel--light' : ''}`}>{children}</div>
}

export interface SlotProps extends ButtonProps {
  /** `down` for a downed Pokémon, `ok` once a choice is locked. */
  state?: 'normal' | 'down' | 'ok'
  selected?: boolean
}

/** A row that can be chosen, in the manner of the party screen. */
export function Slot({ state = 'normal', selected = false, children, ...rest }: SlotProps) {
  const modifier = state === 'normal' ? '' : ` dn-slot--${state}`
  return (
    <button type="button" className={`dn-slot${modifier}`} aria-pressed={selected} {...rest}>
      {children}
    </button>
  )
}

export interface OptionButtonProps extends ButtonProps {
  /** The current choice among several, or the main action of a screen. */
  selected?: boolean
  primary?: boolean
}

/** A small button for a choice or an action, in the manner of the options screen. */
export function OptionButton({ selected, primary = false, children, ...rest }: OptionButtonProps) {
  return (
    <button
      type="button"
      className={`dn-option${primary ? ' dn-option--primary' : ''}`}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  )
}

export type CommandId = 'fight' | 'bag' | 'run' | 'switch'

export interface CommandMenuProps {
  /** The four labels, in the app's language. */
  labels: Record<CommandId, string>
  /** Commands that cannot be used right now. */
  disabled?: readonly CommandId[]
  onCommand: (command: CommandId) => void
  /** Something for the free corner, top right: the way to the battlefield plan. */
  children?: ReactNode
}

/**
 * The battle's four commands on the touch screen: FIGHT as the great ball in
 * the middle, BAG, RUN and SWITCH along the bottom.
 */
export function CommandMenu({ labels, disabled = [], onCommand, children }: CommandMenuProps) {
  const order: CommandId[] = ['fight', 'bag', 'run', 'switch']
  return (
    <div className="dn-commands">
      {order.map((command) => (
        <button
          key={command}
          type="button"
          className={`dn-command dn-command--${command}`}
          disabled={disabled.includes(command)}
          onClick={() => onCommand(command)}
        >
          <span className="dn-command__label">{labels[command]}</span>
        </button>
      ))}
      {children}
    </div>
  )
}

/** A small tile hanging from the top right corner of the touch screen, beside the ball. */
export function CornerButton({ children, ...rest }: ButtonProps) {
  return (
    <button type="button" className="dn-command dn-command--corner" {...rest}>
      <span className="dn-command__label">{children}</span>
    </button>
  )
}
