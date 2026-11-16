import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { OfflineState } from '../../pwa/use-offline-status'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { Home } from './Home'
import { LoadingScreen } from './LoadingScreen'

interface HomeArgs {
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

function HomeScreen({ offline, update }: HomeArgs) {
  const pack = usePack()
  const [opened, setOpened] = useState<string>()
  return (
    <Phone>
      <Home
        pack={pack}
        entries={['characters', 'session', 'campaigns', 'options']}
        offline={{ ...OFFLINE[offline], updateAvailable: update, applyUpdate: () => setOpened('update') }}
        onOpen={setOpened}
      />
      <Note>
        The app’s first screen: its name, the app’s emblem (the den, its light climbing; decision 192), three Pokémon, and its ways in. Under
        them, a line says how far the app is from working with no network (decisions 181 and
        182); set <code>offline</code> to read each state: getting ready (the app itself, a few seconds), the sprites being fetched in the
        background with their count, the same once the network is lost, and ready. In a browser that cannot keep the app, nothing is said here
        (the Options do). With <code>update</code>, a new version waits: it is offered here and in the Options only (decision 183).
        {opened && ` You pressed “${opened}”.`}
      </Note>
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
  args: { offline: 'ready', update: false },
  argTypes: { offline: { control: 'select', options: ['preparing', 'sprites', 'stalled', 'ready', 'unsupported'] } },
  render: (args) => <HomeScreen {...args} />,
}
