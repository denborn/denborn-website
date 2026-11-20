import { AnimatePresence, MotionConfig, motion, useIsPresent } from 'motion/react'
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react'
import { DURATION, EASE } from '../motion'

export interface TrayProps {
  /** Whether it is over the screen. */
  open: boolean
  /** Its title: shown at its top and read as its name. */
  title: string
  /** The spoken name of the key that shuts it. */
  closeLabel: string
  onClose: () => void
  /** Its own keys along the bottom, when it has some. */
  foot?: ReactNode
  children: ReactNode
}

/** What can take the focus inside a tray. */
const TAKES_FOCUS = 'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'

/**
 * What comes over a bottom screen of the Pokédex (decisions 289, 292 and
 * 293): a tray that slides up from under the screen's edge and covers it, as
 * the games' search panel does. It is a dialog: the focus goes into it and
 * stays, Escape or its cross shuts it, and the focus goes back to what opened
 * it. It is put on the screen after the page it covers, which its owner marks
 * `covered`; it never leaves its screen, so nothing of it is drawn over the
 * frame.
 */
export function Tray({ open, ...box }: TrayProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{open && <TrayBox {...box} />}</AnimatePresence>
    </MotionConfig>
  )
}

function TrayBox({ title, closeLabel, onClose, foot, children }: Omit<TrayProps, 'open'>) {
  const box = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const present = useIsPresent()

  // The focus goes in as the tray comes: to what it marks as first, or to the first thing it offers.
  const opener = useRef<HTMLElement>(undefined)
  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const first = box.current?.querySelector<HTMLElement>('[data-tray-first]') ?? box.current?.querySelector<HTMLElement>(TAKES_FOCUS)
    first?.focus({ preventScroll: true })
  }, [])
  // It goes back as the tray starts to go, to what opened it if that is still there.
  useEffect(() => {
    if (!present && opener.current?.isConnected) opener.current.focus({ preventScroll: true })
  }, [present])

  const key = (event: KeyboardEvent<HTMLDialogElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    // Tab goes round inside the tray: past its last thing, back to its first.
    const offered = [...event.currentTarget.querySelectorAll<HTMLElement>(TAKES_FOCUS)]
    const first = offered[0]
    const last = offered.at(-1)
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <motion.dialog
      ref={box}
      open
      className="dn-tray"
      aria-modal="true"
      aria-labelledby={titleId}
      inert={!present}
      onKeyDown={key}
      initial={{ y: '100%' }}
      animate={{ y: 0, transition: { duration: DURATION.move, ease: EASE.out } }}
      exit={{ y: '100%', transition: { duration: DURATION.quick, ease: EASE.in } }}
    >
      <header className="dn-tray__head">
        <h3 id={titleId} className="dn-tray__title">
          {title}
        </h3>
        <button type="button" className="dn-tray__close" aria-label={closeLabel} onClick={onClose} />
      </header>
      <div className="dn-tray__body">{children}</div>
      {foot && <div className="dn-dex-foot">{foot}</div>}
    </motion.dialog>
  )
}
