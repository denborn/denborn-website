import { useMessages } from '../../i18n'
// From the kit's own files, not its one door (src/ui/index.ts): what every visit starts from brings only the pieces it shows.
import { DualScreen } from '../../ui/DualScreen'
import { Screen } from '../../ui/Screen'
import { OptionButton } from '../../ui/controls'
import { StepHeader } from '../../ui/forms'
import { DEN, DenScreen } from '../home/DenScreen'

export interface AccountProps {
  onBack: () => void
}

/**
 * What this device keeps, as files (decision 223): where all of it will be
 * downloaded, and saves exported and imported. None of these tools is built
 * yet, and the screen says so; it holds nothing else.
 */
export function Account({ onBack }: AccountProps) {
  const messages = useMessages()
  const text = messages.account
  return (
    <DualScreen>
      <DenScreen key={DEN} label={text.title} />
      <Screen kind="menu" label={text.title} scrolls>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          <p className="dn-note">{text.soon}</p>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
