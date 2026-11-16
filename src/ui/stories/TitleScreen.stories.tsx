import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Screen } from '../Screen'
import { usePrefersReducedMotion } from '../reduced-motion'
import type { TitlePhase } from '../title-intro'
import { TITLE_PHASES } from '../title-intro'
import { TitleScene } from '../title-scene'
import { Note, Phone, Section, useLocale } from './board'
import type { TitleLook } from './proposals'
import { TITLE_LOOKS, TITLE_LOOK_NAMES, titleWording } from './proposals'

interface TitleArgs {
  /** Which proposed look the name has (see To decide). */
  look: TitleLook
}

/** The name, in one of the proposed looks. On the board it is not a heading: the app's own is the page's h1. */
function Name({ look }: TitleArgs) {
  return <div className={`dn-title${look === 'today' ? '' : ` sb-title--${look}`}`}>Denborn</div>
}

/** The black bottom screen with its one button. */
function Start({ shown, still }: { shown: boolean; still: boolean }) {
  const words = titleWording[useLocale()].touchToStart[0]
  return (
    <Screen kind="blank" label="Denborn" tall>
      <button type="button" className={`dn-start${shown ? ' dn-start--shown' : ''}${still ? ' dn-start--still' : ''}`}>
        <span className="dn-start__words dn-text-outline">{words}</span>
      </button>
    </Screen>
  )
}

function Intro({ look }: TitleArgs) {
  const reduced = usePrefersReducedMotion()
  const [run, setRun] = useState(0)
  const [stormed, setStormed] = useState(false)
  return (
    <Phone>
      <Note>
        The app opens on this (decisions 202 to 207). The den stands in Showdown’s meadow with no light; its light rises; a red bolt strikes
        as the plain turns dark; the name appears a little above the middle; then rain falls and red lightning strikes every 2 to 5 seconds,
        sometimes twice. The bottom screen stays black; TOUCH TO START shows once the storm has come. One tap, at any moment, opens the home
        menu in its place (Screens/Home), the storm going on above it. With reduced motion, or the Options’ switch off, it opens on the storm
        standing still.
      </Note>
      <div className="sb-tools">
        <button
          type="button"
          onClick={() => {
            setStormed(false)
            setRun((before) => before + 1)
          }}
        >
          Play again
        </button>
      </div>
      <div className="sb-device" key={run}>
        <div className="dn-page">
          <div className="dn-page__top">
            <Screen kind="scene" label="Denborn">
              <TitleScene intro still={reduced} onStorm={() => setStormed(true)}>
                <Name look={look} />
              </TitleScene>
            </Screen>
          </div>
          <Start shown={stormed || reduced} still={reduced} />
        </div>
      </div>
    </Phone>
  )
}

const STEP_NAMES: Record<TitlePhase, string> = {
  day: '1. The den in daylight, no light',
  rising: '2. Its light rises',
  strike: '3. A red bolt; the plain turns dark',
  named: '4. The name appears',
  storm: '5. The storm: rain, and lightning at uneven gaps',
}

function Steps({ look }: TitleArgs) {
  return (
    <Phone>
      <Note>
        Each step held still. In the app each lasts: daylight 1.2 s, the rise 1 s, the strike and the dark 0.8 s, the name 0.6 s; then the
        storm lasts. A bolt is a new shape each time, on either side of the light, in the part of the sky the screen shows. The den is the
        one redrawn as rectangles (decision 210): by day its pit is dark; its light, once up, falls pink on the rocks and on the ground,
        and the night dims the rocks as it dims the plain.
      </Note>
      {TITLE_PHASES.map((phase) => (
        <Section key={phase} title={STEP_NAMES[phase]}>
          <Screen kind="scene" label={STEP_NAMES[phase]}>
            <TitleScene intro={false} still={phase !== 'strike' && phase !== 'storm'} at={phase}>
              <Name look={look} />
            </TitleScene>
          </Screen>
        </Section>
      ))}
    </Phone>
  )
}

function Widths({ look }: TitleArgs) {
  return (
    <div className="sb-stack" style={{ justifyItems: 'center' }}>
      <Note>
        The scene keeps its own pixels whole on every phone, so a phone shows a little more or less of the meadow at its sides and top; the
        den stays in the middle, on the ground, and the name stays where it is on the screen. The light hangs from the top of the screen, so
        that its fade in squares is whole on every phone; a shorter screen shows less of its whole part (decision 210). The app is never
        wider than 480 px.
      </Note>
      {[320, 412, 480].map((width) => (
        <Section key={width} title={`${width} px`}>
          <div style={{ width }}>
            <Screen kind="scene" label={`${width} px`}>
              <TitleScene intro={false} still>
                <Name look={look} />
              </TitleScene>
            </Screen>
          </div>
        </Section>
      ))}
    </div>
  )
}

function Still({ look }: TitleArgs) {
  return (
    <Phone>
      <Note>
        With reduced motion, or with the Options’ switch off (decision 206): the storm stands still. The rain hangs, the light holds its
        first frame, no lightning flashes, and TOUCH TO START does not blink.
      </Note>
      <div className="dn-page">
        <div className="dn-page__top">
          <Screen kind="scene" label="Denborn">
            <TitleScene intro={false} still>
              <Name look={look} />
            </TitleScene>
          </Screen>
        </div>
        <Start shown still />
      </div>
    </Phone>
  )
}

const meta = {
  title: 'Screens/Title screen',
  args: { look: 'gilded' },
  argTypes: { look: { control: 'select', options: TITLE_LOOKS, labels: TITLE_LOOK_NAMES } },
} satisfies Meta<TitleArgs>
export default meta

export const Playing: StoryObj<TitleArgs> = { render: (args) => <Intro {...args} /> }
export const EachStep: StoryObj<TitleArgs> = { render: (args) => <Steps {...args} /> }
export const OnEveryPhone: StoryObj<TitleArgs> = { render: (args) => <Widths {...args} /> }
export const StandingStill: StoryObj<TitleArgs> = { render: (args) => <Still {...args} /> }
