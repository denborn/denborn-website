import type { ReactNode } from 'react'

export interface DexPageProps {
  /** The screen's title: read out, and given the focus when the screen comes in. It is not drawn: the bar of steps says where one is. */
  title: string
  /** The bar across the top: the steps. */
  steps: ReactNode
  /** The keys along the bottom. */
  foot: ReactNode
  /** Something has come over the screen: what is under it cannot be pressed, tabbed to or read. */
  covered?: boolean
  children: ReactNode
}

/**
 * A bottom screen of the Pokédex (decision 287): the steps across the top,
 * what the step holds in the middle, the keys along the bottom. The two bars
 * stay while a screen changes; what is between them and the keys come and go.
 * What comes over the screen (a `Tray`) is put after it, on the same screen.
 */
export function DexPage({ title, steps, foot, covered = false, children }: DexPageProps) {
  return (
    <div className="dn-dex-page" inert={covered}>
      {steps}
      <div className="dn-dex-body">
        <h2 className="dn-visually-hidden" tabIndex={-1} data-page-heading>
          {title}
        </h2>
        {children}
      </div>
      <div className="dn-dex-foot">{foot}</div>
    </div>
  )
}

export interface StepBarStep<Id extends string> {
  id: Id
  /** Its name, read out: the bar shows its icon alone. */
  name: string
  icon: ReactNode
  /** It has what it needs. */
  done: boolean
  /** It can be gone to. */
  open: boolean
}

export interface StepBarProps<Id extends string> {
  /** What the bar is, for assistive technology. */
  label: string
  steps: readonly StepBarStep<Id>[]
  current: Id
  onStep: (step: Id) => void
  /** The way out of the Pokédex, at the bar's start: its spoken name and what it does. */
  back: { label: string; onBack: () => void }
}

/**
 * The steps of the Pokédex, across the top of its bottom screen (decision
 * 289): one key a step, with its icon, the one being done lit; a press goes to
 * any step that is open. A lamp under each icon is on once the step has what
 * it needs. Before them, the way out.
 */
export function StepBar<Id extends string>({ label, steps, current, onStep, back }: StepBarProps<Id>) {
  return (
    <nav className="dn-dex-steps" aria-label={label}>
      <button type="button" className="dn-dex-back" aria-label={back.label} onClick={back.onBack} />
      <ol className="dn-dex-steps__list">
        {steps.map((step) => (
          <li key={step.id}>
            <button
              type="button"
              className={`dn-dex-step${step.done ? ' dn-dex-step--done' : ''}`}
              aria-label={step.name}
              aria-current={step.id === current ? 'step' : undefined}
              disabled={!step.open && step.id !== current}
              onClick={() => {
                if (step.id !== current) onStep(step.id)
              }}
            >
              <span className="dn-dex-step__icon">{step.icon}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
