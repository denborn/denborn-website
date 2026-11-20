import { type ReactNode, useState } from 'react'
import { ScrollingBlock } from '../../ui'
import { DexLamp, Wheel, type WheelSize } from '../../ui/dex'

/** What a row does, told under its wheel: a line of facts, then its text. */
export interface About {
  lead?: ReactNode
  text: string
}

/** A wheel in a tray: shorter than a screen's own, to leave room for what its row in the middle does. */
export const FILTER_WHEEL: WheelSize = { height: 118, row: 24 }

/** The id of a row that stands for "any": no move and no Ability has an empty one. */
export const ANY = ''

export interface FilterWheelProps<Option extends { id: string; name: string }> {
  label: string
  /** What narrows the wheel, over it. */
  bar?: ReactNode
  size?: WheelSize
  none: string
  options: readonly Option[]
  /** How a row is drawn: a lamp and the name when left out. */
  row?: (option: Option, lit: boolean) => ReactNode
  /** The row it opens on; the first with none. */
  start: string | undefined
  /** Whether a row's lamp is lit: one the filter keeps, one the Pokémon has. */
  isKept: (id: string) => boolean
  /** What the row in the middle does; nothing for "any". */
  about: (id: string) => About | undefined
  still: boolean
  /** What a press on the row in the middle does: nothing when left out. */
  onPress?: (id: string) => void
  /** The keys beside what the row in the middle does, for that row; nothing while the wheel is empty. */
  keys: (id: string | undefined) => ReactNode
}

/**
 * Something chosen on a wheel, in a tray: an Ability, moves, an item to hold
 * (decision 308: every one the same way). Under the wheel, what the row in
 * the middle does, and beside it the keys that act on that row, small
 * (decision 301). What they do is their user's.
 */
export function FilterWheel<Option extends { id: string; name: string }>({ label, bar, size = FILTER_WHEEL, none, options, row, start, isKept, about, still, onPress, keys }: FilterWheelProps<Option>) {
  const [looked, setLooked] = useState(start)
  const at = options.find((option) => option.id === looked) ?? options[0]
  const told = at === undefined || at.id === ANY ? undefined : about(at.id)
  return (
    <div className={`dn-dex-filter-wheel${bar ? ' dn-dex-filter-wheel--barred' : ''}`}>
      {bar}
      <Wheel
        label={label}
        items={options}
        centred={at?.id}
        onCentre={setLooked}
        onPick={onPress}
        size={size}
        rail
        empty={none}
        row={
          row ??
          ((option, lit) => (
            <span className={`dn-dex-bar dn-dex-row${lit ? ' dn-dex-bar--lit' : ''}`}>
              <DexLamp on={isKept(option.id)} />
              <span className="dn-dex-bar__name">{option.name}</span>
            </span>
          ))
        }
      />
      <div className="dn-dex-filter-wheel__foot">
        <ScrollingBlock className="dn-dex-move-about" text={told?.text ?? ''} lead={told?.lead} still={still} />
        <div className="dn-dex-filter-wheel__keys">{keys(at?.id)}</div>
      </div>
    </div>
  )
}
