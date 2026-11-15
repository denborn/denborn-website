import { type ReactNode, type SyntheticEvent, useRef, useState } from 'react'
import type { DataPack } from '../../data/types'
import { sheetNumbers } from '../../domain/sheet'
import { type Language, useLanguage, useMessages } from '../../i18n'
import type { Messages } from '../../i18n/en'
import type { WriteResult } from '../../storage/library'
import { OptionButton, Screen, StepHeader, TextField } from '../../ui'
import { Portrait } from '../sheet/Portrait'
import type { Incoming, IncomingCharacter, IncomingProblem } from './incoming'

/** Why the camera cannot be used: refused by the user or the browser, absent, or no way to read a QR code here. */
export type CameraProblem = 'denied' | 'none' | 'unsupported'

export interface CameraProps {
  /** What a QR code in the picture says. */
  onText: (text: string) => void
  onProblem: (problem: CameraProblem) => void
}

export interface ImportCharacterProps {
  pack: DataPack
  /** A code given on arrival, when a character's link was opened from outside the app. */
  arrivedWith?: string | undefined
  /** Reads the text of a picked file. */
  readFile: (text: string) => Incoming
  /** Reads a pasted or scanned text. */
  readCode: (text: string) => Incoming
  /** The text of a picked file, or nothing when the file is larger than any of Denborn's. */
  textOfFile: (file: File) => Promise<string | undefined>
  /** Draws the camera's picture and reads the QR codes in it. Left out where there is no way to scan. */
  camera?: ((props: CameraProps) => ReactNode) | undefined
  /** Keeps the character on this device, in the place of the copy kept here when there is one. */
  onKeep: (incoming: IncomingCharacter) => WriteResult
  /** Shows the sheet of the character kept here under an id. */
  onOpen: (id: string) => void
  onBack: () => void
}

type Way = 'file' | 'link' | 'qr'
type WayProblem = { way: 'file' | 'link'; reason: IncomingProblem } | { way: 'qr'; reason: IncomingProblem | CameraProblem }

type Step =
  /** Choosing a way in; what went wrong with the last one tried, if anything. */
  | { at: 'ask'; problem?: WayProblem }
  | { at: 'scan' }
  /** A character was read; `notKept` when the device then refused to keep it. */
  | { at: 'found'; incoming: IncomingCharacter; notKept?: Extract<WriteResult, { ok: false }>['reason'] }

const afterReading = (incoming: Incoming, way: Way): Step => (incoming.ok ? { at: 'found', incoming } : { at: 'ask', problem: { way, reason: incoming.problem } })

/**
 * Taking in a character: by its file, its link or code, or its QR code. What
 * is read is shown before anything is kept, and when this device already has
 * a copy, both are shown and the player chooses (decision 107).
 */
export function ImportCharacter({ pack, arrivedWith, readFile, readCode, textOfFile, camera, onKeep, onOpen, onBack }: ImportCharacterProps) {
  const language = useLanguage()
  const messages = useMessages()
  const text = messages.import
  const [step, setStep] = useState<Step>(() => (arrivedWith === undefined ? { at: 'ask' } : afterReading(readCode(arrivedWith), 'link')))
  const numbers = step.at === 'found' ? sheetNumbers(step.incoming.character, pack) : undefined
  // Reading a file takes a moment: only the last file picked may speak.
  const reading = useRef(0)

  const keep = (incoming: IncomingCharacter): void => {
    const saved = onKeep(incoming)
    if (saved.ok) onOpen(incoming.character.id)
    else setStep({ at: 'found', incoming, notKept: saved.reason })
  }

  return (
    <div className="dn-page">
      <div className="dn-page__top">
        <Screen kind="scene" label={text.title}>
          {step.at === 'ask' && (
            <div className="dn-lineup">
              <p className="dn-note dn-text-outline">{text.hint}</p>
            </div>
          )}
          {step.at === 'scan' && camera && (
            <div className="dn-camera">
              {camera({
                onText: (scanned) => setStep(afterReading(readCode(scanned), 'qr')),
                onProblem: (reason) => setStep({ at: 'ask', problem: { way: 'qr', reason } }),
              })}
              <span className="dn-camera__frame" />
            </div>
          )}
          {step.at === 'found' && numbers && <Portrait pack={pack} character={step.incoming.character} numbers={numbers} language={language} messages={messages} />}
        </Screen>
      </div>
      <Screen kind="menu" label={text.title} tall>
        <StepHeader title={text.title} />
        {step.at === 'ask' && (
          <WaysIn
            text={text}
            problem={step.problem}
            canScan={camera !== undefined}
            onFile={async (file) => {
              const mine = ++reading.current
              const content = await textOfFile(file)
              if (mine !== reading.current) return
              setStep(content === undefined ? { at: 'ask', problem: { way: 'file', reason: 'tooLarge' } } : afterReading(readFile(content), 'file'))
            }}
            onLink={(link) => setStep(afterReading(readCode(link), 'link'))}
            onScan={() => setStep({ at: 'scan' })}
          />
        )}
        {step.at === 'scan' && (
          <div className="dn-stack">
            <p className="dn-note">{text.aim}</p>
            <p className="dn-note" role="status">
              {text.looking}
            </p>
          </div>
        )}
        {step.at === 'found' && <Found incoming={step.incoming} notKept={step.notKept} pack={pack} messages={messages} language={language} onKeep={keep} onOpen={onOpen} />}
        <div className="dn-foot">
          {step.at === 'ask' && <OptionButton onClick={onBack}>{messages.nav.back}</OptionButton>}
          {step.at === 'scan' && <OptionButton onClick={() => setStep({ at: 'ask' })}>{text.stop}</OptionButton>}
          {step.at === 'found' && <OptionButton onClick={() => setStep({ at: 'ask' })}>{messages.nav.back}</OptionButton>}
        </div>
      </Screen>
    </div>
  )
}

interface WaysInProps {
  text: Messages['import']
  problem: WayProblem | undefined
  canScan: boolean
  onFile: (file: File) => Promise<void>
  onLink: (link: string) => void
  onScan: () => void
}

/** The three ways in, each with what went wrong the last time it was tried. */
function WaysIn({ text, problem, canScan, onFile, onLink, onScan }: WaysInProps) {
  const [link, setLink] = useState('')
  const picker = useRef<HTMLInputElement>(null)
  const said = (way: Way): string | undefined => {
    if (problem?.way !== way) return undefined
    return problem.reason === 'denied' || problem.reason === 'none' || problem.reason === 'unsupported' ? text.camera[problem.reason] : text.problem[problem.reason]
  }
  const open = (event: SyntheticEvent): void => {
    event.preventDefault()
    onLink(link)
  }

  return (
    <div className="dn-stack">
      <div role="group" aria-label={text.file} className="dn-entry">
        <span className="dn-label">{text.file}</span>
        <WayNote problem={said('file')} hint={text.fileHint} />
        <div className="dn-row">
          <OptionButton primary onClick={() => picker.current?.click()}>
            {text.chooseFile}
          </OptionButton>
        </div>
        {/* The browser's own file window does the choosing; the button above opens it. */}
        <input
          ref={picker}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            // Emptied, so that choosing the same file again is still a change.
            event.currentTarget.value = ''
            if (file) void onFile(file)
          }}
        />
      </div>

      <form className="dn-entry" onSubmit={open}>
        <TextField
          label={text.link}
          value={link}
          onChange={setLink}
          hint={said('link') ?? text.linkHint}
          invalid={said('link') !== undefined}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        <div className="dn-row">
          <OptionButton submit disabled={link.trim() === ''}>
            {text.open}
          </OptionButton>
        </div>
      </form>

      {canScan && (
        <div role="group" aria-label={text.qr} className="dn-entry">
          <span className="dn-label">{text.qr}</span>
          <WayNote problem={said('qr')} hint={text.qrHint} />
          <div className="dn-row">
            <OptionButton onClick={onScan}>{text.scan}</OptionButton>
          </div>
        </div>
      )}
    </div>
  )
}

/** Under a way in: how to use it, or what went wrong with it. */
function WayNote({ problem, hint }: { problem: string | undefined; hint: string }) {
  return problem ? (
    <p className="dn-note dn-note--error" role="alert">
      {problem}
    </p>
  ) : (
    <p className="dn-note">{hint}</p>
  )
}

interface FoundProps {
  incoming: IncomingCharacter
  notKept: Extract<WriteResult, { ok: false }>['reason'] | undefined
  pack: DataPack
  messages: Messages
  language: Language
  onKeep: (incoming: IncomingCharacter) => void
  onOpen: (id: string) => void
}

/** A character that was read: new here, already here as it is, or already here in another state. */
function Found({ incoming, notKept, pack, messages, language, onKeep, onOpen }: FoundProps) {
  const text = messages.import
  const { character, kept, standing } = incoming
  const species = pack.species[character.species]?.name[language] ?? character.species
  const warnings = (
    <>
      {incoming.otherGameData && <p className="dn-note dn-note--error">{messages.sheet.otherData}</p>}
      {notKept && (
        <p className="dn-note dn-note--error" role="alert">
          {messages.saving[notKept]}
        </p>
      )}
    </>
  )

  if (standing === 'same') {
    return (
      <div className="dn-stack">
        <p className="dn-note">{text.same(character.nickname)}</p>
        <div className="dn-row">
          <OptionButton primary onClick={() => onOpen(character.id)}>
            {text.seeSheet}
          </OptionButton>
        </div>
      </div>
    )
  }

  if (standing === 'new') {
    return (
      <div className="dn-stack">
        <p className="dn-note">{text.ready(character.nickname)}</p>
        <dl className="dn-facts">
          <dt>{messages.sheet.species}</dt>
          <dd>{species}</dd>
          <dt>{messages.battle.level}</dt>
          <dd>{character.level}</dd>
          <dt>{messages.sheet.campaign}</dt>
          <dd>{character.campaign.name}</dd>
        </dl>
        {warnings}
        <div className="dn-row">
          <OptionButton primary onClick={() => onKeep(incoming)}>
            {text.add}
          </OptionButton>
        </div>
      </div>
    )
  }

  // Already here, and not alike: both are shown, and nothing is replaced without a tap (decision 107).
  const rows: { name: string; of: (copy: typeof character) => number }[] = [
    { name: messages.battle.level, of: (copy) => copy.level },
    { name: messages.sheet.exp, of: (copy) => copy.exp },
    { name: messages.battle.hp, of: (copy) => copy.hp },
    { name: messages.sheet.moneyLabel, of: (copy) => copy.money },
  ]
  return (
    <div className="dn-stack">
      <p className="dn-note">{text.already(character.nickname)}</p>
      <p className="dn-label">{text.verdict[standing]}</p>
      <table className="dn-figures dn-figures--even">
        <thead>
          <tr>
            <th scope="col">{species}</th>
            <th scope="col">{text.here}</th>
            <th scope="col">{text.incoming}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{kept ? row.of(kept) : messages.sheet.noFigure}</td>
              <td>{row.of(character)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {warnings}
      <div className="dn-row">
        <OptionButton primary={standing === 'newer'} onClick={() => onKeep(incoming)}>
          {text.replace}
        </OptionButton>
        <OptionButton primary={standing === 'older'} onClick={() => onOpen(character.id)}>
          {text.keep}
        </OptionButton>
      </div>
    </div>
  )
}
