import type { Meta, StoryObj } from '@storybook/react-vite'
import type { DataPack } from '../../data/types'
import { sampleCharacter } from '../../domain/samples'
import { sheetNumbers } from '../../domain/sheet'
import { expForLevel } from '../../game-rules/exp'
import { maxPp } from '../../game-rules/pp'
import type { CharacterDocument } from '../../shared/schema/character'
import { Note, Phone, usePack } from '../../ui/stories/board'
import { CharacterSheet } from './CharacterSheet'

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
      <CharacterSheet pack={pack} character={character} numbers={numbers} origin="https://denborn-website.kori-san.workers.dev" onBack={() => undefined} onSaveFile={() => undefined} />
      <Note>
        A character’s sheet. The Pokémon, its HP and its condition stay on the top screen; below, five parts: who it is and its roleplay
        attributes, its stats with the IVs and EVs behind them, its six moves, its bag, and the ways to copy it elsewhere (its file, its QR
        code). It only shows: nothing can be changed here. The control below sets its condition.
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
