import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import type { DataPack } from '../../data/types'
import { sampleCharacter, sampleRules } from '../../domain/samples'
import { QrCode } from '../../ui'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { type CameraProblem, type CameraProps, ImportCharacter } from './ImportCharacter'
import type { Incoming, IncomingProblem, Standing } from './incoming'

interface Args {
  /** How the character read stands against the copy kept here. */
  standing: Standing
  /** What went wrong with the link, for the story of problems. */
  problem: IncomingProblem
  /** What the pretend camera does. */
  camera: 'works' | CameraProblem
}

/** What a reading gives on the board: the sample character, standing as asked against a copy kept here. */
function sampleReading(pack: DataPack, standing: Standing): Incoming {
  const character = sampleCharacter(pack, 50, 'Braise', 6, 12)
  const before = { ...character, level: 48, exp: 110_800, hp: 31, money: 39_100 }
  const after = { ...character, level: 51, exp: 133_000, hp: 157, money: 52_400 }
  const kept = standing === 'newer' ? before : standing === 'older' ? after : standing === 'differs' ? { ...character, hp: 12, money: 47_900 } : standing === 'same' ? character : undefined
  return { ok: true, character, rules: sampleRules(pack, 2, 2, 4), otherGameData: false, standing, ...(kept ? { kept } : {}) }
}

/** The board has no camera: a picture of a QR code stands in for it, and a tap on it acts as if the code had been read. */
function PretendCamera({ onText, onProblem, behaviour }: CameraProps & { behaviour: Args['camera'] }) {
  useEffect(() => {
    if (behaviour !== 'works') onProblem(behaviour)
  }, [behaviour, onProblem])
  return (
    <button type="button" onClick={() => onText('a code')} style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', background: '#6b6257' }}>
      <span style={{ width: '38%', transform: 'rotate(-4deg)' }}>
        <QrCode text="https://denborn-website.kori-san.workers.dev/#DNC1.EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLE" label="A QR code" tooLong="" />
      </span>
    </button>
  )
}

function Import({ standing, problem, camera, arrivedWith }: Args & { arrivedWith?: 'character' | 'problem' }) {
  const pack = usePack()
  const read = (): Incoming => (arrivedWith === 'problem' ? { ok: false, problem } : sampleReading(pack, standing))
  return (
    <Phone>
      <ImportCharacter
        // A new key makes the screen start over when a control changes what it is given.
        key={`${standing}-${problem}-${camera}`}
        pack={pack}
        arrivedWith={arrivedWith}
        readFile={read}
        readCode={read}
        textOfFile={() => Promise.resolve('a file')}
        camera={(props) => <PretendCamera {...props} behaviour={camera} />}
        onKeep={() => ({ ok: true })}
        onOpen={() => undefined}
        onBack={() => undefined}
      />
    </Phone>
  )
}

const meta = {
  title: 'Screens/Import a character',
  component: Import,
  args: { standing: 'new', problem: 'rulesUnknown', camera: 'works' },
  argTypes: {
    standing: { control: 'inline-radio', options: ['new', 'same', 'newer', 'older', 'differs', 'unreadable'] },
    problem: { control: 'select', options: ['notACharacter', 'creationLink', 'campaignFile', 'tooLarge', 'damaged', 'newer', 'rulesUnknown', 'invalid'] },
    camera: { control: 'inline-radio', options: ['works', 'denied', 'none', 'unsupported'] },
  },
} satisfies Meta<typeof Import>
export default meta
type Story = StoryObj<typeof meta>

/** The three ways in. */
export const WaysIn: Story = {
  render: (args) => (
    <>
      <Import {...args} />
      <Note>
        A character comes in by its file, by its link or code pasted, or by its QR code scanned with the camera. Here every way reads the
        same sample character; the camera is pretend.
      </Note>
    </>
  ),
}

/** What was read is shown before anything is kept. The control sets how it stands against a copy already here. */
export const Found: Story = {
  render: (args) => (
    <>
      <Import {...args} arrivedWith="character" />
      <Note>
        A character that was read. New here: it is shown, then added with a tap. Already here and alike: nothing to do but see its sheet.
        Already here and not alike (decision 107): both copies side by side, which is more recent, and the choice to replace or to keep the
        one here. Set <code>standing</code> below.
      </Note>
    </>
  ),
}

/** Scanning: the camera's picture takes the top screen. */
export const Scanning: Story = {
  render: (args) => (
    <>
      <Import {...args} />
      <Note>
        Scanning. The camera’s picture fills the top screen, with a frame to aim into. On the board a still picture stands in for the
        camera: tap it to act as if the code had been read. Set <code>camera</code> below to see what is said when the camera cannot be
        used.
      </Note>
    </>
  ),
  // Opens the scanner as a tap on its button would (the last of the three ways in), once the game data has loaded and the screen is there.
  play: async ({ canvasElement }) => {
    for (let tries = 0; tries < 100; tries++) {
      const scan = canvasElement.querySelector<HTMLButtonElement>('[role="group"]:last-of-type button')
      if (scan) {
        scan.click()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  },
}

/** What is said when what was given cannot be taken in. */
export const Problems: Story = {
  render: (args) => (
    <>
      <Import {...args} arrivedWith="problem" />
      <Note>
        When what was given cannot be taken in, the way that was tried says why. Set <code>problem</code> below to read each reason.
      </Note>
    </>
  ),
}
