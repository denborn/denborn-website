import type { Meta, StoryObj } from '@storybook/react-vite'
import type { DataPack } from '../../data/types'
import { sampleCharacter } from '../../domain/samples'
import { sheetNumbers } from '../../domain/sheet'
import { expForLevel } from '../../game-rules/exp'
import { maxPp } from '../../game-rules/pp'
import type { CharacterDocument } from '../../shared/schema/character'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { useLanguage, useMessages } from '../../i18n'
import { CharacterSheet } from './CharacterSheet'
import { PaperSheet } from './PaperSheet'
import { RemoveCharacter } from './RemoveCharacter'
import { SheetUnavailable } from './SheetUnavailable'
import type { SheetProblem } from './open-sheet'

const ORIGIN = 'https://denborn-website.kori-san.workers.dev'

interface Args {
  condition: 'standing' | 'downed' | 'dead'
}

/** The sample as it stands (paralysed, hurt), or brought down: no HP and no status left. */
function inCondition(character: CharacterDocument, condition: Args['condition']): CharacterDocument {
  if (condition === 'standing') return character
  const down: CharacterDocument = { ...character, hp: 0, condition: condition === 'downed' ? { state: 'downed', stacks: 2 } : { state: 'dead' } }
  delete down.status
  return down
}

/** The sample was made to measure codes, and its PP are any numbers; a sheet shows PP a move can have. */
function withPossiblePp(character: CharacterDocument, pack: DataPack): CharacterDocument {
  const moves = character.moves.map((slot) => {
    const move = pack.moves[slot.id]
    return move ? { ...slot, pp: Math.min(slot.pp, maxPp(move.pp, slot.ppUps, move.fixedPp)) } : slot
  })
  return { ...character, moves }
}

function Sheet({ condition }: Args) {
  const pack = usePack()
  const sample = withPossiblePp({ ...sampleCharacter(pack, 50, 'Braise', 6, 12), exp: expForLevel(50) + 3200 }, pack)
  const character = inCondition(sample, condition)
  const numbers = sheetNumbers(character, pack)
  if (!numbers) return null
  return (
    <Phone>
      <CharacterSheet pack={pack} character={character} numbers={numbers} origin={ORIGIN} onBack={() => undefined} onSaveFile={() => undefined} onPrint={() => window.print()} onRemove={() => undefined} />
      <Note>
        A character’s sheet. The Pokémon, its HP and its condition stay on the top screen; below, five parts: who it is and its roleplay
        attributes, its stats with the IVs and EVs behind them, its six moves, its bag, and the ways to take it elsewhere (its file, its
        sheet on paper, its QR code). It only shows: nothing can be changed here. The control below sets its condition.
      </Note>
    </Phone>
  )
}

const meta = {
  title: 'Screens/Character sheet',
  component: Sheet,
  args: { condition: 'standing' },
  argTypes: { condition: { control: 'inline-radio', options: ['standing', 'downed', 'dead'] } },
} satisfies Meta<typeof Sheet>
export default meta

export const FiveParts: StoryObj<typeof meta> = {}

function Paper({ condition }: Args) {
  const pack = usePack()
  const language = useLanguage()
  const messages = useMessages()
  const sample = withPossiblePp({ ...sampleCharacter(pack, 50, 'Braise', 6, 12), exp: expForLevel(50) + 3200 }, pack)
  const character = inCondition(sample, condition)
  const numbers = sheetNumbers(character, pack)
  if (!numbers) return null
  return (
    <>
      <PaperSheet pack={pack} character={character} numbers={numbers} language={language} messages={messages} origin={ORIGIN} preview />
      <Note>
        The sheet on paper (decision 98), shown here as an A4 page. In the app it exists only in print: PRINT ITS SHEET on the SHARE tab, or
        the browser’s own print command, puts it on the page in place of the screens. Black on white; types and categories are words in
        boxes, since printers leave coloured backgrounds out. The QR code is drawn as lines, so it stays sharp.
      </Note>
    </>
  )
}

/** The printed sheet, as a page. */
export const OnPaper: StoryObj<typeof meta> = { render: (args) => <Paper {...args} /> }

function Removal({ condition }: Args) {
  const pack = usePack()
  const language = useLanguage()
  const messages = useMessages()
  const sample = withPossiblePp({ ...sampleCharacter(pack, 50, 'Braise', 6, 12), exp: expForLevel(50) + 3200 }, pack)
  const character = inCondition(sample, condition)
  const numbers = sheetNumbers(character, pack)
  if (!numbers) return null
  const handlers = { onSaveFile: () => undefined, onRemove: () => undefined, onKeep: () => undefined }
  return (
    <>
      <Phone>
        <RemoveCharacter shown={{ pack, character, numbers, language, messages }} {...handlers} />
      </Phone>
      <Phone>
        <RemoveCharacter shown={undefined} {...handlers} />
      </Phone>
      <Note>
        Before a character leaves the device (decision 110): the removal cannot be undone, so its file is offered first, and it is the
        button put forward. REMOVE and KEEP IT are the two ways out. The second phone shows the same question for an entry that cannot be
        read. The way here is at the end of the sheet’s SHARE tab (decision 111).
      </Note>
    </>
  )
}

/** The question asked before a character is removed from the device. */
export const Removing: StoryObj<typeof meta> = { render: (args) => <Removal {...args} /> }

const PROBLEMS: SheetProblem[] = ['missing', 'unreadable', 'newer', 'rulesUnknown', 'invalid']

/** In the sheet's place when there is none to show: each reason, one under the other. */
export const NoSheet: StoryObj<typeof meta> = {
  render: () => (
    <>
      {PROBLEMS.map((problem) => (
        <Phone key={problem}>
          <SheetUnavailable problem={problem} onBack={() => undefined} {...(problem === 'missing' ? {} : { onSaveFile: () => undefined, onRemove: () => undefined })} />
        </Phone>
      ))}
      <Note>
        A kept character goes through the same checks as one from outside before its sheet is drawn. When it does not pass, or cannot be
        read, the page says why, and what is kept can still leave as a file.
      </Note>
    </>
  ),
}
