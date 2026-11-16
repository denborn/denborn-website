import { useMessages } from '../../i18n'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from must not bring the animation library with it.
import { Screen } from '../../ui/Screen'
import { OptionButton } from '../../ui/controls'
import { StepHeader } from '../../ui/forms'
import { AppEmblem } from '../../ui/sprites'
import { CREDIT_IDS, CREDIT_LINKS, type CreditId, SHEET_RIPPERS } from './sources'

export interface CreditsProps {
  onBack: () => void
}

/**
 * The credits inside the app (decisions 184 and 195): whose work the app
 * shows or runs on, one after the other, each with what is theirs. People and
 * teams, not packages: licences and libraries are in the repository's
 * CREDITS.md. It works with no network; only the links out of the app need
 * one.
 */
export function Credits({ onBack }: CreditsProps) {
  const messages = useMessages()
  const text = messages.credits
  const theirs = (id: CreditId): string => (id === 'sheets' ? text.entries.sheets.theirs(SHEET_RIPPERS.join(', ')) : text.entries[id].theirs)
  return (
    <div className="dn-page">
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          <div className="dn-row">
            <AppEmblem />
          </div>
          <p className="dn-note">{text.intro}</p>
          <ul className="dn-credits">
            {CREDIT_IDS.map((id) => (
              <li key={id} className="dn-credit">
                <span className="dn-credit__who">{text.entries[id].who}</span>
                <span className="dn-note">{theirs(id)}</span>
                {CREDIT_LINKS[id].length > 0 && (
                  <span className="dn-credit__links">
                    {CREDIT_LINKS[id].map((link) => (
                      <a key={link.url} className="dn-anchor" href={link.url} target="_blank" rel="noreferrer">
                        {link.name}
                      </a>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="dn-note">{text.more}</p>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}
