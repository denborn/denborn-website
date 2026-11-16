import { Component, type ComponentType, type ReactNode, Suspense, lazy, useEffect, useRef } from 'react'
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation, useNavigate } from 'react-router'
import { usePack } from '../data/use-pack'
import { LoadingScreen } from '../features/home/LoadingScreen'
import { useMessages } from '../i18n'
import { useOfflineStatus } from '../pwa/use-offline-status'
import { decodeCreationCode } from '../shared/codec/codes'
import { joinCodeIn } from '../shared/protocol/room-code'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from must not bring the animation library with it.
import { Screen } from '../ui/Screen'
import { OptionButton } from '../ui/controls'
import { incomingKind } from './incoming-link'
import { useLibrary } from './library-store'
import { OfflineContext } from './offline'
import { CreditsPage, HomePage, OptionsPage } from './pages'
import { TitleGateContext, createTitleGate, opensOnTitle } from './title-gate'

// Read as the app starts, before anything changes the address: a link's code is taken out of it on arrival.
const titleGate = createTitleGate(opensOnTitle(window.location.pathname, window.location.hash))

/**
 * The pages a visit does not start from are fetched when first opened, each
 * with its part of the app: a player's characters, a game master's campaigns,
 * a session. Until one is there, the loading screen shows; once the app works
 * offline, they are all kept on the device like the rest.
 */
const characters = () => import('./pages-characters')
const campaigns = () => import('./pages-campaigns')
const session = () => import('./pages-session')

/** One page of a part of the app that is fetched when first opened. */
function onDemand<Part>(part: () => Promise<Part>, name: keyof Part) {
  return lazy(async () => ({ default: (await part())[name] as ComponentType }))
}

const CharactersPage = onDemand(characters, 'CharactersPage')
const NewCharacterPage = onDemand(characters, 'NewCharacterPage')
const CreateCharacterPage = onDemand(characters, 'CreateCharacterPage')
const ImportCharacterPage = onDemand(characters, 'ImportCharacterPage')
const CharacterPage = onDemand(characters, 'CharacterPage')
const RemoveCharacterPage = onDemand(characters, 'RemoveCharacterPage')
const CampaignsPage = onDemand(campaigns, 'CampaignsPage')
const CampaignPage = onDemand(campaigns, 'CampaignPage')
const ImportCampaignPage = onDemand(campaigns, 'ImportCampaignPage')
const RemoveCampaignPage = onDemand(campaigns, 'RemoveCampaignPage')
const HostSessionPage = onDemand(campaigns, 'HostSessionPage')
const EncountersPage = onDemand(campaigns, 'EncountersPage')
const EncounterPage = onDemand(campaigns, 'EncounterPage')
const JoinSessionPage = onDemand(session, 'JoinSessionPage')

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
      const kind = incomingKind(code)
      if (kind === 'character') {
        void navigate('/characters/import', { replace: true, state: { code } })
        return
      }
      if (kind === 'join') {
        // A session's join link (decision 124): the join screen opens with the code filled in, or empty when the link holds none.
        void navigate(`/session/${joinCodeIn(code) ?? ''}`, { replace: true })
        return
      }
      if (kind !== 'creation') return
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
  const shown = useRef(pathname)
  useEffect(() => {
    // Only once the page has changed: on the one a visit opens on, the focus stays where the browser put it.
    if (shown.current !== pathname) document.querySelector<HTMLElement>('[data-page-heading]')?.focus()
    shown.current = pathname
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** The title screen belongs to the home: leaving the home some other way than by its one tap, on a link's code for one, passes it too. */
function TitleEndsOffHome() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/') titleGate.pass()
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
      <TitleGateContext value={titleGate}>
        <main className="app dn-root">
          <LoadBoundary>
            <Suspense fallback={<LoadingScreen />}>
              <IncomingLink />
              <FocusOnNavigation />
              <TitleEndsOffHome />
              <Outlet />
            </Suspense>
          </LoadBoundary>
        </main>
      </TitleGateContext>
    </OfflineProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'options', element: <OptionsPage /> },
      { path: 'credits', element: <CreditsPage /> },
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
