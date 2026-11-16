import { MotionConfig } from 'motion/react'
import { Component, type ReactNode, Suspense, useEffect, useRef } from 'react'
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation, useNavigate } from 'react-router'
import { usePack } from '../data/use-pack'
import { LoadingScreen } from '../features/home/LoadingScreen'
import { useMessages } from '../i18n'
import { useOfflineStatus } from '../pwa/use-offline-status'
import { decodeCreationCode } from '../shared/codec/codes'
import { joinCodeIn } from '../shared/protocol/room-code'
import { OptionButton, Screen } from '../ui'
import { useLibrary } from './library-store'
import { OfflineContext } from './offline'
import { CampaignPage, CampaignsPage, EncounterPage, EncountersPage, HostSessionPage, ImportCampaignPage, JoinSessionPage, RemoveCampaignPage, CharacterPage, CharactersPage, CreateCharacterPage, HomePage, ImportCharacterPage, NewCharacterPage, OptionsPage, RemoveCharacterPage } from './pages'

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
 * A link to the app carries its code after a "#": a creation link, a
 * character's own, or a session's join link. On arrival, and whenever the
 * address changes to one, a join link opens the join screen; a
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
      if (/^dnj\d/i.test(code)) {
        // A session's join link (decision 124): the join screen opens with the code filled in, or empty when the link holds none.
        void navigate(`/session/${joinCodeIn(code) ?? ''}`, { replace: true })
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

/**
 * The one place that registers the service worker; the home and the options show its state. It is a component
 * of its own so that the count of sprites, which moves often, redraws the screens that show it and nothing else.
 */
function OfflineProvider({ children }: { children: ReactNode }) {
  return <OfflineContext value={useOfflineStatus()}>{children}</OfflineContext>
}

function Shell() {
  return (
    <OfflineProvider>
      <MotionConfig reducedMotion="user">
        <main className="app dn-root">
          <LoadBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <IncomingLink />
              <FocusOnNavigation />
              <Outlet />
            </Suspense>
          </LoadBoundary>
        </main>
      </MotionConfig>
    </OfflineProvider>
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
      { path: 'campaigns/import', element: <ImportCampaignPage /> },
      { path: 'campaigns/:id', element: <CampaignPage /> },
      { path: 'campaigns/:id/remove', element: <RemoveCampaignPage /> },
      { path: 'campaigns/:id/session', element: <HostSessionPage /> },
      { path: 'campaigns/:id/encounters', element: <EncountersPage /> },
      { path: 'campaigns/:id/encounters/new', element: <EncounterPage /> },
      { path: 'campaigns/:id/encounters/:encounterId', element: <EncounterPage /> },
      { path: 'session', element: <JoinSessionPage /> },
      { path: 'session/:code', element: <JoinSessionPage /> },
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
