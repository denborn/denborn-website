import type { Meta, StoryObj } from '@storybook/react-vite'
import { Note, Phone } from '../../ui/stories/board'
import { Credits } from './Credits'

const meta = { title: 'Screens/Credits' } satisfies Meta
export default meta

export const Screen: StoryObj = {
  render: () => (
    <Phone>
      <Credits onBack={() => undefined} />
      <Note>
        The credits inside the app (decisions 184 and 195), opened from the home screen and from the Options. They thank people and teams, each
        with what of theirs is in the app: the games’ owners, the Pokémon Showdown team, PokéAPI, Poké Corpus, the artist of the MissingNo.
        GIF, the rippers of the sprite sheets, the font’s authors. A name underlined opens their page (that alone needs a network). It is not a
        list of packages: licences and libraries stay in `CREDITS.md`, as the last line says.
      </Note>
    </Phone>
  ),
}
