import type { Meta, StoryObj } from '@storybook/react-vite'
import { Screen } from '../Screen'
import type { TitlePhase } from '../title-intro'
import { TITLE_PHASES } from '../title-intro'
import { TitleScene } from '../title-scene'
import { Note, Phone, Section } from './board'

/** The name. On the board it is not a heading: the app's own is the page's h1. */
function Name() {
  return (
    <div className="dn-title">
      <span className="dn-title__letters">Denborn</span>
    </div>
  )
}

const STEP_NAMES: Record<TitlePhase, string> = {
  day: '1. The den in daylight, no light',
  rising: '2. Its light rises',
  strike: '3. A red bolt; the plain turns dark',
  named: '4. The name appears',
  storm: '5. The storm: rain, and lightning at uneven gaps',
}

function Steps() {
  return (
    <Phone>
      <Note>
        The scene of the app’s first screen (decisions 202 to 207; the whole screen, with TOUCH TO START and the menu, is under
        Screens/Home). Each step held still. In the app each lasts: daylight 0.8 s, the rise 1 s, the strike and the dark 0.8 s, the name
        0.6 s; then the storm lasts, its lightning 2 to 5 seconds apart, sometimes twice. A bolt is a new shape each time, on either side
        of the light, in the part of the sky the screen shows. The den is the one redrawn as rectangles (decision 210): by day its pit is
        dark; its light, once up, falls pink on the rocks and on the ground, and the night dims the rocks as it dims the plain. The name
        is gilded (decision 211).
      </Note>
      {TITLE_PHASES.map((phase) => (
        <Section key={phase} title={STEP_NAMES[phase]}>
          <Screen kind="scene" label={STEP_NAMES[phase]}>
            <TitleScene intro={false} still={phase !== 'strike' && phase !== 'storm'} at={phase}>
              <Name />
            </TitleScene>
          </Screen>
        </Section>
      ))}
    </Phone>
  )
}

function Widths() {
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
                <Name />
              </TitleScene>
            </Screen>
          </div>
        </Section>
      ))}
    </div>
  )
}

const meta = { title: 'Screens/Title screen' } satisfies Meta
export default meta

export const EachStep: StoryObj = { render: () => <Steps /> }
export const OnEveryPhone: StoryObj = { render: () => <Widths /> }
