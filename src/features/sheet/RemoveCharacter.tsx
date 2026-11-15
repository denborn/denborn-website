import { useMessages } from '../../i18n'
import { OptionButton, Screen, StepHeader } from '../../ui'
import { Portrait } from './Portrait'
import type { SheetView } from './shown'

export interface RemoveCharacterProps {
  /** The character, when its sheet can be shown; nothing for an entry that cannot be read or checked. */
  shown: SheetView | undefined
  onSaveFile: () => void
  onRemove: () => void
  onKeep: () => void
}

/**
 * The last screen before a character leaves this device (decision 110): it
 * says the removal cannot be undone, offers the file first, and only then
 * the removal. The file is the button put forward; removing and keeping are
 * the two ways out.
 */
export function RemoveCharacter({ shown, onSaveFile, onRemove, onKeep }: RemoveCharacterProps) {
  const messages = useMessages()
  const text = messages.sheet
  const title = shown ? text.removal.title(shown.character.nickname) : text.removal.titleUnreadable
  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={title}>
          {shown ? (
            <Portrait {...shown} />
          ) : (
            <div className="dn-lineup">
              <p className="dn-note dn-text-outline">{messages.characters.unreadable}</p>
            </div>
          )}
        </Screen>
      </div>
      <Screen kind="menu" label={title} tall>
        <StepHeader title={title} />
        <div className="dn-stack">
          <p className="dn-note dn-note--error">{text.removal.warning}</p>
          <p className="dn-note">{text.removal.fileHint}</p>
          <div className="dn-row">
            <OptionButton primary onClick={onSaveFile}>
              {text.saveFile}
            </OptionButton>
          </div>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onKeep}>{text.removal.keep}</OptionButton>
          <OptionButton onClick={onRemove}>{text.removal.remove}</OptionButton>
        </div>
      </Screen>
    </div>
  )
}
