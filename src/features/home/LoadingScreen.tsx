import { useMessages } from '../../i18n'
import { AppEmblem, Screen } from '../../ui'

/** Shown while the game data loads: the app's emblem, as a console shows a game's icon while it starts (decision 192). */
export function LoadingScreen() {
  const messages = useMessages()
  return (
    <Screen kind="menu" label={messages.nav.loading}>
      <div className="dn-lineup dn-lineup--loading">
        <AppEmblem scale={2} />
        <p className="dn-note" role="status">
          {messages.nav.loading}
        </p>
      </div>
    </Screen>
  )
}
