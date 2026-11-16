/**
 * The app's pages: each one ties a screen (src/features) to the address bar
 * and to what the device keeps. The screens themselves know neither.
 *
 * This file holds the pages every visit starts from: the home, the options and
 * the credits. The others are in files of their own, fetched when first
 * opened (App.tsx): a player's characters, a game master's campaigns, a
 * session.
 */
import { useLocation, useNavigate } from 'react-router'
import { usePack } from '../data/use-pack'
import { Credits } from '../features/credits/Credits'
import { Home } from '../features/home/Home'
import { Options } from '../features/options/Options'
import { useMessages } from '../i18n'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'

export function HomePage() {
  const navigate = useNavigate()
  usePageTitle(undefined)
  return <Home pack={usePack()} entries={['characters', 'session', 'campaigns', 'options']} offline={useOffline()} onOpen={(entry) => void navigate(`/${entry}`)} onCredits={() => void navigate('/credits')} />
}

/** The credits inside the app (decision 184). */
export function CreditsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  usePageTitle(useMessages().credits.title)
  // Back to the screen it was opened from, the home or the Options, when it is in this visit's history.
  return <Credits onBack={() => void (location.key !== 'default' ? navigate(-1) : navigate('/'))} />
}

export function OptionsPage() {
  const navigate = useNavigate()
  usePageTitle(useMessages().options.title)
  return <Options offline={useOffline()} onCredits={() => void navigate('/credits')} onBack={() => void navigate('/')} />
}
