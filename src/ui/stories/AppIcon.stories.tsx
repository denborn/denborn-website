import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { AppEmblem, Screen } from '..'
import { Note, Phone, Section } from './board'

/** A still icon as a phone or a browser shows it: at a size, under the shape the phone cuts it to, on what lies behind it. */
function Still({ file, size, radius, name, ground = 'transparent' }: { file: string; size: number; radius: string; name: string; ground?: string }) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 6, justifyItems: 'center' }}>
      <img src={file} alt={name} width={size} height={size} style={{ borderRadius: radius, imageRendering: 'pixelated', display: 'block', background: ground }} />
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

function TheBall() {
  return (
    <Phone>
      <Section title="Animated, inside the app (decision 212)">
        <Note>
          The pink grid ball rocks as a Poké Ball shakes in the games: to the left and back, to the right and back, then a pause. It rolls
          as it tips, five pixels at most either way, in eleven steps of 50 ms, then rests 700 ms. The glow round it and the light on it stay
          where they are; the band, the grid and the shade turn with it. With reduced motion it stays upright. It shows while the game data
          loads and on the credits screen, over the menu screens’ faint plus marks.
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
          pixels across, so that its 32 keep a margin, with the same grid as the others (decision 213); Android’s round-cut one keeps the widest, the whole ball inside the circle Android
          always shows.
        </Note>
        <Row>
          <Still file="/apple-touch-icon.png" size={120} radius="22.5%" name="iPhone" />
          <Still file="/icon-maskable-512.png" size={120} radius="50%" name="Android, cut round" />
          <Still file="/icon-192.png" size={96} radius="0" name="Android, whole" ground="#f2f2f2" />
          <Still file="/icon-32.png" size={32} radius="0" name="Tab, light" ground="#f2f2f2" />
          <Still file="/icon-32.png" size={32} radius="0" name="Tab, dark" ground="#202124" />
          <Still file="/icon-32.png" size={16} radius="0" name="Tab, small" ground="#f2f2f2" />
        </Row>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Foundations/App icon' } satisfies Meta
export default meta

export const Ball: StoryObj = { render: () => <TheBall /> }
