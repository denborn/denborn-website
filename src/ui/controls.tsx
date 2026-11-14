import { type ButtonHTMLAttributes, type ReactNode, useId } from 'react'

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
  /** True for the button that sends the form it is in. */
  submit?: boolean
}

/** A small button for a choice or an action, in the manner of the options screen. */
export function OptionButton({ selected, primary = false, submit = false, children, ...rest }: OptionButtonProps) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
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

export interface TabsProps<Id extends string> {
  /** What the tabs are, for assistive technology. */
  label: string
  tabs: readonly { id: Id; label: string }[]
  current: Id
  onChange: (id: Id) => void
  /** The part the current tab shows. */
  children: ReactNode
}

/**
 * A row of tabs and the part the current one shows. The arrow keys, Home and
 * End move between the tabs, as in any row of tabs; only the current tab is a
 * stop for the Tab key, and the part is the next one.
 */
export function Tabs<Id extends string>({ label, tabs, current, onChange, children }: TabsProps<Id>) {
  const set = useId()
  const tabId = (id: Id): string => `${set}-tab-${id}`
  const go = (index: number): void => {
    const next = tabs[(index + tabs.length) % tabs.length]
    if (!next) return
    onChange(next.id)
    // Focus goes with the choice. Every tab is on the page already, so it can take it now.
    document.getElementById(tabId(next.id))?.focus()
  }
  return (
    <>
      <div className="dn-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            className="dn-tab"
            aria-selected={tab.id === current}
            aria-controls={`${set}-part`}
            tabIndex={tab.id === current ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') go(index + 1)
              else if (event.key === 'ArrowLeft') go(index - 1)
              else if (event.key === 'Home') go(0)
              else if (event.key === 'End') go(tabs.length - 1)
              else return
              event.preventDefault()
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* A stop for the Tab key itself: a part may hold nothing else that takes focus. */}
      <div className="dn-stack" role="tabpanel" id={`${set}-part`} aria-labelledby={tabId(current)} tabIndex={0}>
        {children}
      </div>
    </>
  )
}
