import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Device, Note, Phone } from '../../ui/stories/board'
import { Home } from './Home'
import { LoadingScreen } from './LoadingScreen'

interface HomeArgs {
  /** The app has just started: the title shows first. Off, the title is already passed. */
  title: boolean
  /** The Options' switch for the title screen's animation. */
  animation: boolean
  /** A new version of the app waits. */
  update: boolean
  /** The window's width: a small phone's, or a phone's. */
  width: 320 | 412
}

/** One start of the app: the title until it is passed, then the menu. */
function Start({ title, animation, update, width }: HomeArgs) {
  const [titled, setTitled] = useState(title)
  const [opened, setOpened] = useState<string>()
  return (
    <>
      <Device width={width} height={width === 320 ? 568 : 839}>
        <Home
          titled={titled}
          animated={animation}
          onStart={() => setTitled(false)}
          onOpen={setOpened}
          onUpdate={update ? () => setOpened('update') : undefined}
        />
      </Device>
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
        screen stays black; TOUCH TO START shows once the storm has come. One tap, at any moment and on either screen, has the menu fly
        in in its place in the app (shown under Screens/The DS, Changing; here the menu is put there at once), the storm going on above it. With reduced motion, or with <code>animation</code> off (the Options’ switch), it opens
        on the storm standing still. With <code>title</code> off, the title is already passed, as when coming back from another screen.
      </Note>
      <Note>
        The menu (decisions 221 to 224, 230 to 233, 235, 237) is a grid of four rows of two. Its buttons are plates in the colours of their Pokémon: two
        flat halves, the upper one a shade lighter, a faint checker on the lower one, in a party slot's rim; under each Pokémon, a round
        shadow, as on the field.
        Everything starts from the left: the Pokémon, in a place that is the same on every button and on every screen, in whose middle it stands on the bottom, then one word: CHARACTERS with Pikachu, CAMPAIGNS with Eternamax
        Eternatus, JOIN with Falinks, OPTIONS with Klang, ACCOUNT with Mega Starmie. UPDATE alone has the options screen’s shape, pointed
        at both ends, its word in the middle and Unown as its last letter, as large as the other Pokémon and centred on the capitals (decisions 233, 235 and 237). It cannot be pressed, and
        reads UPDATE ?, until a new version waits: switch <code>update</code> on and Unown pops up as an exclamation mark, UPDATE !, and the button is lit (decision 222). The fourth row is empty; the notice is a line under the grid. The credits and the state of the offline cache are in
        the Options only. Hold a button down: it sinks and lights up, its rim turns white and its Pokémon hops off its shadow; let go, and it springs back
        (decision 224). The colours are Denborn’s own, from colours measured elsewhere, and are to be judged here. Set{' '}
        <code>width</code> to 320 for a small phone’s window (320 × 568); the other is a phone’s, 412 × 839. The two screens are whole in
        the window’s middle, black above and below (decision 215).
      </Note>
      <div className="sb-tools">
        <button type="button" onClick={() => setRun((before) => before + 1)}>
          Start again
        </button>
      </div>
      <Start key={`${run} ${args.title} ${args.animation} ${args.width}`} {...args} />
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
        Shown while the game data loads, a moment at most (decision 220): the menu’s backdrop on both screens and, on the bottom one,
        the app’s emblem, the ball rocking left and right then resting (decision 212), as a console shows a game’s icon while it starts
        (decision 192), over the word. With reduced motion the ball stays upright.
      </Note>
    </Phone>
  ),
}

export const FirstScreen: StoryObj<HomeArgs> = {
  args: { title: true, animation: true, update: false, width: 412 },
  argTypes: { width: { control: 'inline-radio', options: [320, 412] } },
  render: (args) => <HomeScreen {...args} />,
}

/** The menu as it is once the title is passed: what the six buttons look like. */
export const Menu: StoryObj<HomeArgs> = {
  args: { title: false, animation: true, update: false, width: 412 },
  argTypes: { width: { control: 'inline-radio', options: [320, 412] } },
  render: (args) => <HomeScreen {...args} />,
}
