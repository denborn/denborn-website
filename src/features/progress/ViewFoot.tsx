import type { ReactNode } from 'react'

export interface ViewFootProps {
  /** What is said about the buttons: where the last request stands, or the question they answer. Nothing when there is nothing to say. */
  said?: ReactNode
  /** The buttons. */
  children: ReactNode
}

/**
 * The foot of a view of a character's progress: its buttons and, over them,
 * what is said about them. Both stay in sight however far the list above
 * has been scrolled, so that an answer is never given off screen.
 */
export function ViewFoot({ said, children }: ViewFootProps) {
  return (
    <div className={`dn-foot${said ? ' dn-foot--said' : ''}`}>
      {said && <div className="dn-foot__said">{said}</div>}
      {children}
    </div>
  )
}
