import { useMessages } from '../../i18n'
import { DualScreen, OptionButton, Screen, StepHeader } from '../../ui'

export interface RemoveCampaignProps {
  /** The campaign's name; nothing for an entry that cannot be read. */
  name: string | undefined
  onSaveFile: () => void
  onRemove: () => void
  onKeep: () => void
}

/**
 * The last screen before a campaign leaves this device, the same as for a
 * character (decision 118): the removal cannot be undone, so its file is
 * offered first and put forward; removing and keeping are the two ways out.
 */
export function RemoveCampaign({ name, onSaveFile, onRemove, onKeep }: RemoveCampaignProps) {
  const text = useMessages().campaigns
  const title = name === undefined ? text.removal.titleUnreadable : text.removal.title(name)
  return (
    <DualScreen>
      <Screen kind="scene" label={title}>
        <div className="dn-lineup">
          <p className="dn-note dn-text-outline">{name ?? text.unreadable}</p>
        </div>
      </Screen>
      <Screen kind="menu" label={title} scrolls>
        <StepHeader title={title} />
        <div className="dn-stack">
          <p className="dn-note dn-note--error">{text.removal.warning}</p>
          <p className="dn-note">{text.removal.fileHint}</p>
          <div className="dn-row">
            <OptionButton primary onClick={onSaveFile}>
              {text.saveFile}
            </OptionButton>
          </div>
          <p className="dn-note">{text.removal.characters}</p>
        </div>
        <div className="dn-foot">
          <OptionButton onClick={onKeep}>{text.removal.keep}</OptionButton>
          <OptionButton onClick={onRemove}>{text.removal.remove}</OptionButton>
        </div>
      </Screen>
    </DualScreen>
  )
}
