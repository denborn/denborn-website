import type { Meta, StoryObj } from '@storybook/react-vite'
import { Note, Phone } from '../../ui/stories/board'
import { FEW, type ListArgs, ListOnBoard, MANY, WITH_DEAD } from './samples'

function Carousel(args: ListArgs) {
  return (
    <Phone>
      <Note>
        The list of characters’ bottom screen (decisions 241 to 243). On the left, what is told of the one shown, as a small sheet in a
        game’s text box: its name on a band, its level and species, its types each half the line, its campaign on a plate across it;
        SHEET under it opens its sheet. On the right the one shown, large, on the HeartGold and SoulSilver battle base of its first type
        (a dead one on the Ghost type’s): it is alive, now and then hopping, turning round, looking one way and the other, spinning. The
        arrows and a swipe across it go round them all, the last leading back to the first. The strip across the screen slides under a
        finger, or the mouse held down, and a press on an icon shows that one; a small arrow at an end says there are more that way.
        Another one shown, the one there leaves by the side away from where the next comes in: it hops off, flies off if it is of the
        Flying type, or, dead, breaks up as a ghost; its ground stays, shrinking into its middle as the next one springs out when the
        ground changes; the card’s lines go out and come in. The foot’s three buttons are one size, NEW in the middle, IMPORT blue.
      </Note>
      <ListOnBoard {...args} />
    </Phone>
  )
}

const meta = {
  title: 'Screens/Characters',
  component: Carousel,
  args: { samples: FEW, unreadable: false, kept: true, width: 412 },
  argTypes: { samples: { control: false } },
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

export const Few: Story = {}

export const Many: Story = { args: { samples: MANY } }

export const WithTheDead: Story = { args: { samples: WITH_DEAD } }

export const OneCharacter: Story = { args: { samples: FEW.slice(0, 1) } }

export const None: Story = { args: { samples: [] } }

export const OneCannotBeRead: Story = { args: { unreadable: true } }

export const NothingKept: Story = { args: { kept: false } }

export const SmallPhone: Story = { args: { samples: MANY, width: 320 } }

export const Widest: Story = { args: { samples: MANY, width: 480 } }
