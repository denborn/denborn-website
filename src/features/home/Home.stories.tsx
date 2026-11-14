import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { Home } from './Home'

function HomeScreen() {
  const pack = usePack()
  const [opened, setOpened] = useState<string>()
  return (
    <Phone>
      <Home pack={pack} onOpen={setOpened} />
      <Note>
        The app’s first screen. Three ways in: <strong>Characters</strong> for a player, <strong>Campaigns</strong> for the game master,{' '}
        <strong>Options</strong> for the language and the system check. Joining a live session comes with the relay (milestone 5).
        {opened && ` You pressed “${opened}”.`}
      </Note>
    </Phone>
  )
}

const meta = { title: 'Screens/Home', component: HomeScreen } satisfies Meta<typeof HomeScreen>
export default meta

export const FirstScreen: StoryObj<typeof meta> = {}
