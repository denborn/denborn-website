import type { Meta, StoryObj } from '@storybook/react-vite'
import { Note, Phone } from '../../ui/stories/board'
import { Account } from './Account'

const meta = { title: 'Screens/Account' } satisfies Meta
export default meta

export const Screen: StoryObj = {
  render: () => (
    <Phone>
      <Account onBack={() => undefined} />
      <Note>
        The account (decision 223), opened from the home’s ACCOUNT. It is where everything this device keeps will be downloaded, and saves
        exported and imported, as files: there is no account on a server. None of these tools is built yet, and the screen says so and holds
        nothing else. Its wording is to be judged here, in English and in French.
      </Note>
    </Phone>
  ),
}
