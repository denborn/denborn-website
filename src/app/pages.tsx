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
import { Credits } from '../features/credits/Credits'
import { Home } from '../features/home/Home'
import { Options } from '../features/options/Options'
import { useTitleAnimation } from '../features/options/title-animation'
import { useMessages } from '../i18n'
import { useOffline } from './offline'
import { usePageTitle } from './page-title'
import { useTitleGate } from './title-gate'

export function HomePage() {
  const navigate = useNavigate()
  const title = useTitleGate()
  usePageTitle(undefined)
  return (
    <Home
      entries={['characters', 'session', 'campaigns', 'options']}
      offline={useOffline()}
      titled={title.showing}
      animated={useTitleAnimation() === 'on'}
      onStart={title.pass}
      onOpen={(entry) => void navigate(`/${entry}`)}
      onCredits={() => void navigate('/credits')}
    />
  )
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
