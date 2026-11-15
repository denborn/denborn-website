import { useCallback, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'

export interface UnsavedGuard {
  /** Told whenever the page starts or stops holding changes not saved yet; the page says `false` itself the moment a save is kept. */
  onUnsaved: (unsaved: boolean) => void
  /** Given while the page is being left with changes not saved: the two answers to "leave without saving?". */
  leaving: { stay: () => void; leave: () => void } | undefined
}

/**
 * Guards a page that may hold changes not saved yet: leaving it for another
 * page asks first, and closing the tab or reloading asks too, in the
 * browser's own words. Opening or closing one of the page's own parts (same
 * path, another query) is not leaving.
 */
export function useUnsavedGuard(): UnsavedGuard {
  // Read at the moment a navigation starts, which can be before the page is drawn again: kept beside React's state, not in it.
  const unsaved = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsaved.current && currentLocation.pathname !== nextLocation.pathname)
  useBeforeUnload((event) => {
    if (unsaved.current) event.preventDefault()
  })
  const onUnsaved = useCallback((value: boolean) => {
    unsaved.current = value
  }, [])
  return { onUnsaved, leaving: blocker.state === 'blocked' ? { stay: () => blocker.reset(), leave: () => blocker.proceed() } : undefined }
}
