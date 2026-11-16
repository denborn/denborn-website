import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { OfflineState } from '../../pwa/use-offline-status'
import { Note, Phone } from '../../ui/stories/board'
import { Home } from './Home'
import { LoadingScreen } from './LoadingScreen'

interface HomeArgs {
  /** The app has just started: the title shows first. Off, the title is already passed. */
  title: boolean
  /** The Options' switch for the title screen's animation. */
  animation: boolean
  /** How far the app is from working offline. */
  offline: 'preparing' | 'sprites' | 'stalled' | 'ready' | 'unsupported'
  /** A new version of the app waits. */
  update: boolean
}

const OFFLINE: Record<HomeArgs['offline'], Pick<OfflineState, 'status' | 'sprites'>> = {
  preparing: { status: 'preparing' },
  sprites: { status: 'sprites', sprites: { done: 120, of: 346, stalled: false } },
  stalled: { status: 'sprites', sprites: { done: 120, of: 346, stalled: true } },
  ready: { status: 'ready' },
  unsupported: { status: 'unsupported' },
}

/** One start of the app: the title until it is passed, then the menu. */
function Start({ title, animation, offline, update }: HomeArgs) {
  const [titled, setTitled] = useState(title)
  const [opened, setOpened] = useState<string>()
  return (
    <>
      <div className="sb-device">
        <Home
          entries={['characters', 'session', 'campaigns', 'options']}
          offline={{ ...OFFLINE[offline], updateAvailable: update, applyUpdate: () => setOpened('update') }}
          titled={titled}
          animated={animation}
          onStart={() => setTitled(false)}
          onOpen={setOpened}
          onCredits={() => setOpened('credits')}
        />
      </div>
      {opened && <Note>You pressed “{opened}”.</Note>}
    </>
  )
}

function HomeScreen(args: HomeArgs) {
  const [run, setRun] = useState(0)
  return (
    <Phone>
      <Note>
        The app’s first screen (decisions 203 to 207). Each time the app starts, the den stands in Showdown’s meadow with no light; its
        light rises; a red bolt strikes as the plain turns dark; the name appears; then rain falls and red lightning strikes. The bottom
        screen stays black; TOUCH TO START shows once the storm has come. One tap, at any moment and on either screen, puts the menu in
        its place, the storm going on above it. With reduced motion, or with <code>animation</code> off (the Options’ switch), it opens
        on the storm standing still. With <code>title</code> off, the title is already passed, as when coming back from another screen.
        Under the ways in, a line says how far the app is from working with no network (decisions 181 and 182); set{' '}
        <code>offline</code> to read each state. With <code>update</code>, a new version waits: it is offered here and in the Options
        only (decision 183).
      </Note>
      <div className="sb-tools">
        <button type="button" onClick={() => setRun((before) => before + 1)}>
          Start again
        </button>
      </div>
      <Start key={`${run} ${args.title} ${args.animation}`} {...args} />
    </Phone>
  )
}

const meta = { title: 'Screens/Home' } satisfies Meta
export default meta

/** What shows while the game data loads. */
export const Loading: StoryObj = {
  render: () => (
    <Phone>
      <LoadingScreen />
      <Note>
        Shown while the game data loads, a moment at most: the app’s emblem, the den with its light climbing, as a console shows a game’s icon
        while it starts (decision 192), over the word. With reduced motion the den stands still.
      </Note>
    </Phone>
  ),
}

export const FirstScreen: StoryObj<HomeArgs> = {
  args: { title: true, animation: true, offline: 'ready', update: false },
  argTypes: { offline: { control: 'select', options: ['preparing', 'sprites', 'stalled', 'ready', 'unsupported'] } },
  render: (args) => <HomeScreen {...args} />,
}
