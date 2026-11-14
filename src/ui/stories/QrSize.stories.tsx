import type { Meta, StoryObj } from '@storybook/react-vite'
import { QrCode, qrSide } from '..'
import { SAMPLE_CAMPAIGN, sampleCharacter, sampleRules } from '../../domain/samples'
import { encodeCharacterCode, encodeCreationCode, qrForm } from '../../shared/codec/codes'
import { Note, Section, usePack } from './board'

/** Where the live app is: a QR code holds a link to it that ends with the code, so any camera app can open it. */
const ORIGIN = 'https://denborn-website.kori-san.workers.dev'
const LONG_NAME = 'Éclair-de-Lune du Matin.'

function QrSizes() {
  const pack = usePack()
  const bagKinds = Object.values(pack.items).filter((item) => item.bag).length
  const character = (level: number, name: string, moves: number, stacks: number): string => encodeCharacterCode(sampleCharacter(pack, level, name, moves, stacks))
  const invite = (commonMoves: number, packs: number, items: number, species?: number): string =>
    encodeCreationCode({ campaign: SAMPLE_CAMPAIGN, dataPackVersion: pack.version, rules: sampleRules(pack, commonMoves, packs, items, species) }, pack.species)
  const samples = [
    { title: '1. A character just created', detail: 'Level 5, 2 moves, 4 kinds of item.', code: character(5, 'Volt', 2, 4) },
    { title: '2. A character that has played', detail: 'Level 50, a 24-letter name, 6 moves, 12 kinds of item.', code: character(50, LONG_NAME, 6, 12) },
    { title: '3. A long campaign', detail: 'Level 100, 6 moves, 30 kinds of item.', code: character(100, LONG_NAME, 6, 30) },
    { title: '4. A hoarder', detail: `Level 100, 6 moves, every Bag item there is (${bagKinds} kinds).`, code: character(100, LONG_NAME, 6, bagKinds) },
    { title: '5. A large set of campaign rules', detail: '60 species, 40 common moves, 6 packs of 12 items.', code: invite(40, 6, 12, 60) },
    { title: '6. Larger still', detail: 'All 151 species, 90 common moves, 8 packs of 16 items.', code: invite(90, 8, 16) },
  ]
  return (
    <>
      <Section title="How large may a QR code be?">
        <Note>
          The more a character carries, the finer its QR code. Each square below is drawn as wide as a phone’s screen (300 px). Point a
          phone’s camera at each one, as a player would at a friend’s phone, and note the last that reads quickly. Beyond the limit you
          choose, the app offers the character’s file instead of a QR code; nothing is ever cut.
        </Note>
      </Section>
      {samples.map((sample) => {
        const text = qrForm(sample.code, ORIGIN)
        const side = qrSide(text)
        return (
          <Section key={sample.title} title={sample.title}>
            <Note>
              {sample.detail} <strong>{side === undefined ? 'Too long for any QR code.' : `${side} × ${side} squares`}</strong>, {text.length}{' '}
              characters.
            </Note>
            <div style={{ width: 300 }}>
              <QrCode text={text} label={sample.title} tooLong="Too long for a QR code" />
            </div>
          </Section>
        )
      })}
    </>
  )
}

const meta = { title: 'To decide/QR size', component: QrSizes } satisfies Meta<typeof QrSizes>
export default meta

export const Samples: StoryObj<typeof meta> = {}
