import { Component, type ComponentType, type ReactNode, Suspense, lazy, useEffect } from 'react'
import { NavigationType, Navigate, Outlet, RouterProvider, createBrowserRouter, useLocation, useNavigate, useNavigationType } from 'react-router'
import { usePack } from '../data/use-pack'
import { DEN, DenScreen } from '../features/home/DenScreen'
import { LoadingScreen } from '../features/home/LoadingScreen'
import { useMessages } from '../i18n'
import { useOfflineStatus } from '../pwa/use-offline-status'
import { decodeCreationCode } from '../shared/codec/codes'
import { joinCodeIn } from '../shared/protocol/room-code'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { DualScreen, DualScreenFrame } from '../ui/DualScreen'
import { Screen } from '../ui/Screen'
import { OptionButton } from '../ui/controls'
import { incomingKind } from './incoming-link'
import { useLibrary } from './library-store'
import { OfflineContext } from './offline'
import { AccountPage, CreditsPage, HomePage, OptionsPage } from './pages'
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

// A visit that opens on a link's code starts fetching the page it opens at once, while the game data loads, not after.
const arriving = incomingKind(window.location.hash.slice(1))
if (arriving === 'creation' || arriving === 'character') void characters()
if (arriving === 'join') void session()

/** One page of a part of the app that is fetched when first opened. */
function onDemand<Part>(part: () => Promise<Part>, name: keyof Part) {
  return lazy(async () => ({ default: (await part())[name] as ComponentType }))
}

const CharactersPage = onDemand(characters, 'CharactersPage')
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
    <DualScreen>
      <DenScreen key={DEN} label={messages.nav.failed} />
      <Screen kind="menu" label={messages.nav.failed} scrolls>
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
    </DualScreen>
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

/** The title screen belongs to the home: leaving the home some other way than by its one tap, on a link's code for one, passes it too. */
function TitleEndsOffHome() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname !== '/') titleGate.pass()
  }, [pathname])
  return null
}

/**
 * The one place that registers the service worker; the options show its state, and the home whether a new version waits. It is a component
 * of its own so that the count of sprites, which moves often, redraws the screens that show it and nothing else.
 */
function OfflineProvider({ children }: { children: ReactNode }) {
  return <OfflineContext value={useOfflineStatus()}>{children}</OfflineContext>
}

function Shell() {
  const location = useLocation()
  // Which way the screens move when the address changes: back for a move back through the visit's history, or to an address less far in.
  const depth = location.pathname.split('/').filter(Boolean).length
  const returning = useNavigationType() === NavigationType.Pop
  // While the address still carries a link's code, the page it names is not open yet: the loading screen shows, never the page under
  // the code. React then keeps that screen, not the home, until the page's code has come (the router moves in a transition).
  const linking = incomingKind(location.hash.slice(1)) !== undefined
  return (
    <OfflineProvider>
      <TitleGateContext value={titleGate}>
        <main className="app dn-device dn-root">
          <LoadBoundary>
            {/* The two screens stay while pages come and go: each page only says what they show (decision 218). */}
            <DualScreenFrame route={location.key} depth={depth} returning={returning}>
              <Suspense fallback={<LoadingScreen />}>
                <IncomingLink />
                <TitleEndsOffHome />
                {linking ? <LoadingScreen /> : <Outlet />}
              </Suspense>
            </DualScreenFrame>
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
      { path: 'account', element: <AccountPage /> },
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
      // One page for the whole of a creation, the campaign in the address or not: what is chosen stays as the address changes.
      { path: 'characters/new/:campaignId?', element: <CreateCharacterPage /> },
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
