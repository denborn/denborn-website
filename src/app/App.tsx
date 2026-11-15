import { MotionConfig } from 'motion/react'
import { Component, type ReactNode, Suspense, useEffect, useRef } from 'react'
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation, useNavigate } from 'react-router'
import { usePack } from '../data/use-pack'
import { useMessages } from '../i18n'
import { useOfflineStatus } from '../pwa/use-offline-status'
import { decodeCreationCode } from '../shared/codec/codes'
import { OptionButton, Screen } from '../ui'
import { useLibrary } from './library-store'
import { OfflineContext } from './offline'
import { CampaignPage, CampaignsPage, CharacterPage, CharactersPage, CreateCharacterPage, HomePage, ImportCharacterPage, NewCharacterPage, OptionsPage, RemoveCharacterPage } from './pages'

/** Shown while the game data loads. */
function Loading() {
  const messages = useMessages()
  return (
    <Screen kind="menu" label={messages.nav.loading}>
      <div className="dn-lineup">
        <p className="dn-note" role="status">
          {messages.nav.loading}
        </p>
      </div>
    </Screen>
  )
}

function LoadFailed() {
  const messages = useMessages()
  return (
    <Screen kind="menu" label={messages.nav.failed} tall>
      <div className="dn-stack">
        <p className="dn-note dn-note--error" role="alert">
          {messages.nav.failed}
        </p>
        <div className="dn-row">
          <OptionButton primary onClick={() => window.location.reload()}>
            {messages.nav.retry}
          </OptionButton>
        </div>
      </div>
    </Screen>
  )
}

/** Catches a failure to load what a page needs, and offers to try again instead of a blank page. */
class LoadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override render(): ReactNode {
    return this.state.failed ? <LoadFailed /> : this.props.children
  }
}

/**
 * A link to the app carries its code after a "#": a creation link, or a
 * character's own. On arrival, and whenever the address changes to one, a
 * creation link's campaign is kept on this device and its creation opens; a
 * character's link opens the import screen, which shows the character before
 * anything is kept. The code is then taken out of the address, so that a
 * reload or a bookmark does not open it again.
 */
function IncomingLink() {
  const pack = usePack()
  const navigate = useNavigate()
  const saveInvitation = useLibrary((state) => state.saveInvitation)

  useEffect(() => {
    const take = (): void => {
      const code = window.location.hash.slice(1)
      if (/^dnc\d/i.test(code)) {
        void navigate('/characters/import', { replace: true, state: { code } })
        return
      }
      if (!/^dnr\d/i.test(code)) return
      const decoded = decodeCreationCode(code, pack.species)
      if (decoded.ok) {
        saveInvitation(decoded.value, pack.species)
        void navigate(`/characters/new/${decoded.value.campaign.id}`, { replace: true })
      } else {
        void navigate('/characters/new', { replace: true, state: { problem: decoded.reason } })
      }
    }
    take()
    window.addEventListener('hashchange', take)
    return () => window.removeEventListener('hashchange', take)
  }, [pack, navigate, saveInvitation])
  return null
}

/** On a new page, focus goes to its title: a keyboard starts from the top, a screen reader says where it is. */
function FocusOnNavigation() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) first.current = false
    else document.querySelector<HTMLElement>('[data-page-heading]')?.focus()
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Shell() {
  // The one place that registers the service worker; the options page shows its state.
  const offline = useOfflineStatus()
  return (
    <OfflineContext value={offline}>
      <MotionConfig reducedMotion="user">
        <main className="app dn-root">
          <LoadBoundary>
            <Suspense fallback={<Loading />}>
              <IncomingLink />
              <FocusOnNavigation />
              <Outlet />
            </Suspense>
          </LoadBoundary>
        </main>
      </MotionConfig>
    </OfflineContext>
  )
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'options', element: <OptionsPage /> },
      { path: 'campaigns', element: <CampaignsPage /> },
      { path: 'campaigns/new', element: <CampaignPage /> },
      { path: 'campaigns/:id', element: <CampaignPage /> },
      { path: 'characters', element: <CharactersPage /> },
      { path: 'characters/new', element: <NewCharacterPage /> },
      { path: 'characters/new/:campaignId', element: <CreateCharacterPage /> },
      { path: 'characters/import', element: <ImportCharacterPage /> },
      { path: 'characters/:id', element: <CharacterPage /> },
      { path: 'characters/:id/remove', element: <RemoveCharacterPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
