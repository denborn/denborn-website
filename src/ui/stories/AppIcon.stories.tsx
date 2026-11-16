import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { AppEmblem, Screen } from '..'
import { Note, Phone, Section } from './board'

/** A still icon as a phone shows it: at a size, under the shape the phone cuts it to. */
function Still({ file, size, radius, name }: { file: string; size: number; radius: string; name: string }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 6, justifyItems: 'center' }}>
      <img src={file} alt={name} width={size} height={size} style={{ borderRadius: radius, imageRendering: 'pixelated', display: 'block' }} />
      <figcaption className="sb-note" style={{ margin: 0 }}>
        {name}
      </figcaption>
    </figure>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="sb-row" style={{ alignItems: 'end', gap: 24, flexWrap: 'wrap' }}>
      {children}
    </div>
  )
}

function TheDen() {
  return (
    <Phone>
      <Section title="The den, on the ground of the Pokémon Black icon">
        <Note>
          The app’s icon (decision 191): the icon Pokémon Black shows in the DS menu, without its ball, and the den in the ball’s place. The ground is
          redrawn from what the games’ icon measures (black, with a chequer of small blocks that fades downwards); the den is the owner’s
          picture brought down to the icon’s 32 × 32 pixels, its light cut by the icon’s top as the games’ ball is by its sides.
        </Note>
      </Section>
      <Section title="Animated, inside the app">
        <Note>
          Eight frames in a second: bands climb the light, and two sparks rise beside it. With reduced motion it stays on its first frame. A
          phone’s home screen cannot play an icon, so this one lives inside the app: on the home screen and while the game data loads
          (decision 192; see Screens/Home).
        </Note>
        <Screen kind="menu" label="The emblem">
          <div className="sb-row sb-pad" style={{ alignItems: 'end', gap: 24 }}>
            <AppEmblem scale={3} label="Denborn" />
            <AppEmblem scale={2} />
            <AppEmblem />
          </div>
        </Screen>
      </Section>
      <Section title="Still, on a phone and in a browser">
        <Note>
          The pink grid ball (decision 209), seen from the front, with a margin, on the ground of the Pokémon Black icon: black, with a
          chequer of 3 × 2 blocks that darkens downwards, drawn in the ball’s own pixels to every edge. The tab has a ball of its own, 28
          pixels across, so that its 32 keep a margin; Android’s round-cut one keeps the widest, the whole ball inside the circle Android
          always shows.
        </Note>
        <Row>
          <Still file="/apple-touch-icon.png" size={120} radius="22.5%" name="iPhone" />
          <Still file="/icon-maskable-512.png" size={120} radius="50%" name="Android, cut round" />
          <Still file="/icon-192.png" size={96} radius="0" name="Android, whole" />
          <Still file="/icon-32.png" size={32} radius="0" name="Tab" />
          <Still file="/icon-32.png" size={16} radius="0" name="Tab, small" />
        </Row>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Foundations/App icon' } satisfies Meta
export default meta

export const Den: StoryObj = { render: () => <TheDen /> }
