import { useMessages } from '../../i18n'
import { OptionButton, Screen, StepHeader } from '../../ui'
import type { SheetProblem } from './open-sheet'

export interface SheetUnavailableProps {
  problem: SheetProblem
  onBack: () => void
  /** Given when the device does keep something under that id: it can leave as a file, whatever its state. */
  onSaveFile?: (() => void) | undefined
  /** Given with it: what is kept can be removed too, after a confirmation. */
  onRemove?: (() => void) | undefined
}

/** In the sheet's place when there is none to show: why, and the character's file when there is one to save. */
export function SheetUnavailable({ problem, onBack, onSaveFile, onRemove }: SheetUnavailableProps) {
  const messages = useMessages()
  const text = messages.sheet
  return (
    <div className="dn-page">
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        <div className="dn-stack">
          <p className="dn-note dn-note--error">{text.problems[problem]}</p>
          {onSaveFile && (
            <div className="dn-row">
              <OptionButton primary onClick={onSaveFile}>
                {text.saveFile}
              </OptionButton>
            </div>
          )}
          {onRemove && (
            <div className="dn-row">
              <OptionButton onClick={onRemove}>{text.remove}</OptionButton>
            </div>
          )}
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}
