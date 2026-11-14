import type { Meta, StoryObj } from '@storybook/react-vite'
import { QrCode, qrSide } from '..'
import { sampleCharacter } from '../../domain/samples'
import { encodeCharacterCode, qrForm } from '../../shared/codec/codes'
import { Note, Phone, Section, usePack } from './board'

const ORIGIN = 'https://denborn-website.kori-san.workers.dev'

function QrCodes() {
  const pack = usePack()
  const bagKinds = Object.values(pack.items).filter((item) => item.bag).length
  const light = qrForm(encodeCharacterCode(sampleCharacter(pack, 5, 'Volt', 2, 4)), ORIGIN)
  const heavy = qrForm(encodeCharacterCode(sampleCharacter(pack, 100, 'Éclair-de-Lune du Matin.', 6, bagKinds)), ORIGIN)
  // More kinds of item than there are in the Bag: every held item as well.
  const tooMuch = qrForm(encodeCharacterCode({ ...sampleCharacter(pack, 100, 'Volt', 6, 0), bag: Object.keys(pack.items).slice(0, 150).map((item) => ({ item, quantity: 3 })) }), ORIGIN)
  return (
    <Phone>
      <Section title="QR codes">
        <Note>
          A character as a QR code: a link to the app that ends with the character’s code. Always black on white, with its quiet border.
          The more a character carries, the finer the code; the finest shown is 101 × 101 squares (decision 99). Past that there is no
          QR code: the screen offers the character’s file instead.
        </Note>
        <Note>
          <strong>A character just created</strong>: {qrSide(light)} squares a side.
        </Note>
        <QrCode text={light} label="A character just created" tooLong="—" />
        <Note>
          <strong>One carrying every Bag item</strong>: {qrSide(heavy)} squares a side, the limit.
        </Note>
        <QrCode text={heavy} label="A character carrying every Bag item" tooLong="—" />
        <Note>
          <strong>One carrying 150 kinds of item</strong>: no QR code.
        </Note>
        <QrCode text={tooMuch} label="A character carrying 150 kinds of item" tooLong="This character is too large for a QR code. Use its file." />
      </Section>
    </Phone>
  )
}

const meta = { title: 'Components/QR code', component: QrCodes } satisfies Meta<typeof QrCodes>
export default meta

export const Sizes: StoryObj<typeof meta> = {}
