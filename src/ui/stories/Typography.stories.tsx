import type { Meta, StoryObj } from '@storybook/react-vite'
import { MessageBox, Panel, Screen } from '..'
import { Note, Phone, Section, useBattleText, useLocale, usePack } from './board'

const ACCENTS = 'é è ê ë à â ç ù û ü î ï ô œ É È À Ç Œ « » ! ? … ’'
const SIZES: { size: number; use: string }[] = [
  { size: 8, use: 'badges, labels' },
  { size: 9, use: 'PP' },
  { size: 10, use: 'names, numbers' },
  { size: 11, use: 'move names' },
  { size: 12, use: 'messages' },
  { size: 13, use: 'BAG, RUN, SWITCH' },
  { size: 22, use: 'FIGHT' },
]

function Typography() {
  const pack = usePack()
  const locale = useLocale()
  const text = useBattleText()
  const name = pack.species.farfetchd?.name[locale] ?? ''
  return (
    <Phone>
      <Section title="The font">
        <Note>
          <strong>VT323</strong>, chosen by the owner, under the SIL Open Font License. Sizes are in DS pixels of text; at this font’s
          scale its capitals are as tall as the games’ letters. The smallest size a player has to read a number at is 9.
        </Note>
        <Screen kind="menu" label="Type scale">
          <div className="sb-stack sb-pad" style={{ gap: 'calc(4 * var(--dn-u))' }}>
            {SIZES.map(({ size, use }) => (
              <span key={size} style={{ fontSize: `calc(${size} * var(--dn-t))`, lineHeight: 1, whiteSpace: 'nowrap' }}>
                {name} 0123
                <span style={{ fontSize: 'calc(8 * var(--dn-t))', color: 'var(--dn-text-muted)' }}>
                  {' '}
                  {size} · {use}
                </span>
              </span>
            ))}
          </div>
        </Screen>
      </Section>
      <Section title="Accents and the two text treatments">
        <Note>
          French accents, and the games’ two ways of setting text: a one-pixel shadow on a panel or a colour, a dark outline over the
          scene.
        </Note>
        <Screen label="Text treatments">
          <div className="sb-stack sb-pad">
            <span className="dn-text-outline">{ACCENTS}</span>
            <Panel>
              <span className="dn-text-shadow">{ACCENTS}</span>
            </Panel>
            <Panel tone="light">{ACCENTS}</Panel>
          </div>
          <div className="sb-message">
            <MessageBox text={`${text.messages.agonizing(name)} ${text.messages.bagNoEffect(name)}`} />
          </div>
        </Screen>
      </Section>
    </Phone>
  )
}

const meta = { title: 'Foundations/Typography', component: Typography } satisfies Meta<typeof Typography>
export default meta

export const Font: StoryObj<typeof meta> = {}
