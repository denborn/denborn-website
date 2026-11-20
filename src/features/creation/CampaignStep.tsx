import { type ReactNode, type SyntheticEvent, useState } from 'react'
import type { Messages } from '../../i18n/en'
import type { Invitation } from '../../shared/codec/codes'
import { ScrollingText, TextField } from '../../ui'
import { DexKey, DexLamp, DexPage, Tray, Wheel, type WheelSize } from '../../ui/dex'
import { usePrefersReducedMotion } from '../../ui/reduced-motion'
import type { CameraProblem, CameraProps } from '../scan/camera'
import type { StepChrome } from './Creation'
import { type CampaignLinkProblem, type CampaignLinkRead, campaignsOffered } from './campaign-link'

export interface CampaignStepProps {
  messages: Messages
  chrome: StepChrome
  /** The campaigns this device can create for. */
  invitations: readonly Invitation[]
  /** The campaign the draft is for, when one was chosen before: the wheel opens on it. */
  chosen: string | undefined
  /** The address names a campaign this device does not have. */
  unknown: boolean
  /** Something to say on arrival, when a link opened from outside could not be read. */
  arrivedWith?: CampaignLinkProblem | undefined
  /** Draws the camera's picture and reads the QR codes in it. Left out where there is no way to scan. */
  camera?: ((props: CameraProps) => ReactNode) | undefined
  /** Reads a pasted or scanned text, and keeps the campaign it names on this device. */
  onLink: (text: string) => CampaignLinkRead
  /** Goes on with a campaign. */
  onCreate: (campaignId: string) => void
  /** Goes to make a new campaign, to come back with it (decision 299). */
  onNewCampaign: () => void
}

/** The id of the last row, the one that makes a new campaign: no campaign has an empty one. */
const FRESH = ''

/** The Pokémon's wheel, to the pixel: the same drum in the same place (decision 297). */
const WHEEL: WheelSize = { height: 142, row: 26 }

/** What is over the screen: the field to paste a link in, or the camera; with what went wrong with the last text read. */
type Over = { tray: 'link'; problem?: CampaignLinkProblem } | { tray: 'scan'; problem?: CampaignLinkProblem | CameraProblem }

const isCameraProblem = (problem: string): problem is CameraProblem => problem === 'denied' || problem === 'none' || problem === 'unsupported'

/**
 * Where a character starts (decision 289): the campaign it is made for. The
 * campaigns on this device are on a wheel, and last on it the way to make a
 * new one (decision 299); a creation link, pasted or read as a QR code by the
 * camera, brings another. CREATE goes on with the one in the middle.
 */
export function CampaignStep({ messages, chrome, invitations, chosen, unknown, arrivedWith, camera, onLink, onCreate, onNewCampaign }: CampaignStepProps) {
  const text = messages.creation.dex.campaign
  const words = messages.newCharacter
  const still = usePrefersReducedMotion()
  const rows = [
    ...campaignsOffered(invitations).map((one) => ({ id: one.campaign.id, name: one.campaign.name, level: one.rules.startingLevel })),
    { id: FRESH, name: text.freshName, level: undefined },
  ]
  const [looked, setLooked] = useState(chosen)
  const [over, setOver] = useState<Over>()
  const [link, setLink] = useState('')
  const at = rows.find((one) => one.id === looked) ?? rows[0]
  const create = (id: string): void => (id === FRESH ? onNewCampaign() : onCreate(id))

  const said = (problem: CampaignLinkProblem | CameraProblem): string => {
    if (isCameraProblem(problem)) return text.camera[problem]
    return problem === 'character' || problem === 'join' ? text.problem[problem] : words.problem[problem]
  }
  /** Reads what was pasted or scanned: the campaign it names goes to the middle of the wheel, or the tray says what is wrong. */
  const read = (given: string, tray: Over['tray']): void => {
    const result = onLink(given)
    if (!result.ok) {
      setOver({ tray, problem: result.problem })
      return
    }
    setLooked(result.invitation.campaign.id)
    setLink('')
    setOver(undefined)
  }
  const open = (event: SyntheticEvent): void => {
    event.preventDefault()
    read(link, 'link')
  }
  const close = (): void => setOver(undefined)
  const arrival = unknown ? words.unknownCampaign : arrivedWith ? said(arrivedWith) : undefined

  return (
    <>
      <DexPage
        title={text.title}
        steps={chrome.steps}
        covered={over !== undefined}
        foot={
          arrival ? (
            <p className="dn-dex-foot__said dn-dex-foot__said--problem" role="alert">
              {arrival}
            </p>
          ) : (
            <p className="dn-dex-foot__said">{text.title}</p>
          )
        }
      >
        <div className="dn-dex-campaigns">
          <Wheel
            label={text.list}
            items={rows}
            centred={at?.id}
            onCentre={setLooked}
            onPick={create}
            size={WHEEL}
            // The row that makes a new campaign is always there: the wheel is never empty.
            empty={null}
            // The row with no level is the one that makes a new campaign. Its + stands where a campaign's level does (decision 299).
            row={(campaign, lit) =>
              campaign.level === undefined ? (
                <span className={`dn-dex-bar dn-dex-row dn-dex-bar--fresh${lit ? ' dn-dex-bar--lit' : ''}`}>
                  <DexLamp on={false} />
                  <span className="dn-dex-bar__level dn-dex-bar__plus" aria-hidden="true">
                    +
                  </span>
                  <span className="dn-dex-bar__name">
                    <span aria-hidden="true">{text.fresh}</span>
                    <span className="dn-visually-hidden">{text.freshName}</span>
                  </span>
                </span>
              ) : (
                <span className={`dn-dex-bar dn-dex-row${lit ? ' dn-dex-bar--lit' : ''}`}>
                  <DexLamp on={campaign.id === chosen} />
                  <span className="dn-dex-bar__level">
                    {messages.battle.level} {campaign.level}
                  </span>
                  {/* A name too long for its row goes by, on the row in the middle. */}
                  <span className="dn-dex-bar__name">{lit ? <ScrollingText text={campaign.name} still={still} /> : campaign.name}</span>
                </span>
              )
            }
          />
        </div>
        <div className="dn-dex-campaign-keys">
          <DexKey shape="go" large disabled={!at} onClick={() => at && create(at.id)}>
            {text.create}
          </DexKey>
          <DexKey tone="blue" large onClick={() => setOver({ tray: 'link' })}>
            {text.link}
          </DexKey>
          <DexKey tone="grey" large aria-label={text.scan} onClick={() => setOver({ tray: 'scan' })}>
            {text.qr}
          </DexKey>
        </div>
      </DexPage>

      <Tray open={over?.tray === 'link'} title={words.link} closeLabel={messages.creation.dex.close} onClose={close}>
        <form className="dn-tray__form" onSubmit={open}>
          <TextField
            label={words.link}
            value={link}
            onChange={setLink}
            hint={over?.problem ? said(over.problem) : words.linkHint}
            invalid={over?.problem !== undefined}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            data-tray-first
          />
          <DexKey shape="go" disabled={link.trim() === ''} onClick={open}>
            {words.open}
          </DexKey>
        </form>
      </Tray>

      <Tray open={over?.tray === 'scan'} title={text.scan} closeLabel={messages.creation.dex.close} onClose={close}>
        {over?.tray === 'scan' && over.problem ? (
          <p className="dn-tray__text dn-tray__text--problem" role="alert">
            {said(over.problem)}
          </p>
        ) : camera ? (
          <div className="dn-camera">
            {camera({ onText: (scanned) => read(scanned, 'scan'), onProblem: (problem) => setOver({ tray: 'scan', problem }) })}
            <span className="dn-camera__frame dn-camera__frame--tray" />
          </div>
        ) : (
          <p className="dn-tray__text dn-tray__text--problem" role="alert">
            {text.camera.unsupported}
          </p>
        )}
      </Tray>
    </>
  )
}
