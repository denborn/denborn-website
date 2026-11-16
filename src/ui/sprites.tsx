import { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  APP_EMBLEM,
  type BattleSpriteOptions,
  MISSING_SPRITE_URL,
  type SheetCell,
  battleSpriteUrl,
  categoryIconCell,
  itemIconCell,
  pokemonIconCell,
} from '../data/sprites'
import type { ItemIcon, SpeciesData } from '../data/types'
import { usePixelScale } from './Screen'
import { usePrefersReducedMotion } from './reduced-motion'

export interface PokemonSpriteProps extends BattleSpriteOptions {
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  /** The Pokémon's name, read out; shown only if no picture at all can be. */
  name: string
  /** Size in DS pixels per sprite pixel: 1 is as large as on the DS. */
  scale?: number
  /** Stops the sprite's own animation on the frame it is showing. */
  frozen?: boolean
  /** True when text next to the sprite already names the Pokémon. */
  decorative?: boolean
}

/**
 * A Pokémon's animated battle sprite, drawn so that its pixels stay square.
 * It stands still when asked to, and for anyone who prefers reduced motion.
 * When its sprite is not there (the artwork has none, or the device has not
 * fetched it yet), MissingNo. stands in its place (decision 181), mirrored
 * for a Pokémon seen from behind (decision 188); the name it is read out by
 * stays the Pokémon's own.
 */
export function PokemonSprite({ species, name, scale = 1, frozen = false, decorative = false, back, female }: PokemonSpriteProps) {
  const factor = usePixelScale(scale)
  const still = usePrefersReducedMotion() || frozen
  const options: BattleSpriteOptions = {}
  if (back !== undefined) options.back = back
  if (female !== undefined) options.female = female
  const own = battleSpriteUrl(species, options)
  /** The pictures that could not be loaded. */
  const [failed, setFailed] = useState<readonly string[]>([])
  const standIn = own === undefined || failed.includes(own)
  const url = standIn ? MISSING_SPRITE_URL : own
  const image = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // Remembered per file, so that a change of sprite never shows the old one's size.
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(null)
  const size = loaded?.url === url ? loaded : null

  // A GIF cannot be paused: to hold it still, its current frame is copied to a canvas shown in its place.
  useEffect(() => {
    if (!still || !size || !canvas.current || !image.current) return
    canvas.current.width = size.width
    canvas.current.height = size.height
    canvas.current.getContext('2d')?.drawImage(image.current, 0, 0)
  }, [still, size])

  // Not even MissingNo. could be shown: the name is, so that nothing is lost.
  if (failed.includes(MISSING_SPRITE_URL)) {
    return <span className="dn-sprite dn-sprite--missing">{name}</span>
  }
  const box: CSSProperties = size ? { width: size.width * factor, height: size.height * factor } : { visibility: 'hidden' }
  const fill: CSSProperties = { width: '100%', height: '100%' }
  return (
    <span className={`dn-sprite${standIn && back ? ' dn-sprite--mirrored' : ''}`} style={box} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name}>
      <img
        ref={image}
        className="dn-sprite"
        src={url}
        alt=""
        style={{ ...fill, display: still ? 'none' : 'block' }}
        draggable={false}
        onLoad={(event) => setLoaded({ url, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onError={() => setFailed((before) => (before.includes(url) ? before : [...before, url]))}
      />
      <canvas ref={canvas} className="dn-sprite" style={{ ...fill, display: still ? 'block' : 'none' }} aria-hidden="true" />
    </span>
  )
}

export interface IconProps {
  /** Size in DS pixels per icon pixel: 1 is as large as on the DS. */
  scale?: number
  /** Spoken name. Leave it out when text next to the icon already says it. */
  label?: string | undefined
}

/** One cell of an icon sheet, enlarged so that its pixels stay square. */
function CellIcon({ cell, scale = 1, label }: IconProps & { cell: SheetCell }) {
  const factor = usePixelScale(scale)
  const style: CSSProperties = {
    width: cell.width * factor,
    height: cell.height * factor,
    backgroundImage: `url(${cell.url})`,
    backgroundPosition: `${-cell.x * factor}px ${-cell.y * factor}px`,
    backgroundSize: `${cell.sheetWidth * factor}px auto`,
  }
  return <span className="dn-icon" style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
}

/**
 * The app's emblem, as the DS showed a game's icon in its menu: the den, with
 * the light climbing out of it. It plays through its frames; with reduced
 * motion it stays on the first, which is the app's still icon.
 */
export function AppEmblem({ scale = 1, label }: IconProps) {
  const side = APP_EMBLEM.side * usePixelScale(scale)
  const style = {
    width: side,
    height: side,
    backgroundImage: `url(${APP_EMBLEM.url})`,
    backgroundSize: `${side * APP_EMBLEM.frames}px ${side}px`,
    '--dn-emblem-run': `${-side * APP_EMBLEM.frames}px`,
  } as CSSProperties
  return <span className="dn-emblem" style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />
}

/** A Pokémon's small menu icon, by Pokédex number. */
export function PokemonIcon({ num, ...rest }: IconProps & { num: number }) {
  return <CellIcon cell={pokemonIconCell(num)} {...rest} />
}

/** An item's icon. */
export function ItemIconImage({ icon, ...rest }: IconProps & { icon: ItemIcon }) {
  return <CellIcon cell={itemIconCell(icon)} {...rest} />
}

/** The games' move-category label. `compact` shows its symbol alone. */
export function CategoryIcon({ category, compact = false, ...rest }: IconProps & { category: 'Physical' | 'Special' | 'Status'; compact?: boolean }) {
  return <CellIcon cell={categoryIconCell(category, compact)} {...rest} />
}

export interface TypeLabelProps {
  /** The type's English name, as in the data pack: it picks the colour. */
  type: string
  /** The word shown, in the app's language. */
  text: string
}

/**
 * A type's label, drawn by the app in the type's colours with its name in the
 * app's language (the games' own labels are images, in one language each).
 */
export function TypeLabel({ type, text }: TypeLabelProps) {
  const id = type.toLowerCase()
  const style = { '--dn-type-fill': `var(--dn-type-${id})`, '--dn-type-shade': `var(--dn-type-${id}-shade)` } as CSSProperties
  return (
    <span className="dn-type" style={style}>
      {text}
    </span>
  )
}
