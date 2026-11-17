import { useMessages } from '../../i18n'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { DualScreen } from '../../ui/DualScreen'
import { Screen } from '../../ui/Screen'
import { AppEmblem } from '../../ui/sprites'

/**
 * Shown while the game data loads (decision 220): the menu's backdrop on both
 * screens, and on the bottom one the app's emblem, as a console shows a game's
 * icon while it starts (decision 192).
 */
export function LoadingScreen() {
  const messages = useMessages()
  return (
    <DualScreen>
      <Screen kind="menu" label={messages.nav.loading} />
      <Screen kind="menu" label={messages.nav.loading}>
        <div className="dn-lineup dn-lineup--loading">
          <AppEmblem scale={2} />
          <p className="dn-note" role="status">
            {messages.nav.loading}
          </p>
        </div>
      </Screen>
    </DualScreen>
  )
}
