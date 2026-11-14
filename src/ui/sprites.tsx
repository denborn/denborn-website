import { useReducedMotion } from 'motion/react'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  type BattleSpriteOptions,
  type SheetCell,
  battleSpriteUrl,
  categoryIconCell,
  itemIconCell,
  pokemonIconCell,
  typeIconCell,
} from '../data/sprites'
import type { ItemIcon, SpeciesData } from '../data/types'
import { usePixelScale } from './Screen'

export interface PokemonSpriteProps extends BattleSpriteOptions {
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  /** The Pokémon's name, read out and shown if the sprite cannot be. */
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
 * When there is no sprite, the name is shown instead.
 */
export function PokemonSprite({ species, name, scale = 1, frozen = false, decorative = false, back, female }: PokemonSpriteProps) {
  const factor = usePixelScale(scale)
  const still = useReducedMotion() === true || frozen
  const options: BattleSpriteOptions = {}
  if (back !== undefined) options.back = back
  if (female !== undefined) options.female = female
  const url = battleSpriteUrl(species, options)
  const image = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // Remembered per file, so that a change of sprite never shows the old one's size.
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const size = loaded?.url === url ? loaded : null

  // A GIF cannot be paused: to hold it still, its current frame is copied to a canvas shown in its place.
  useEffect(() => {
    if (!still || !size || !canvas.current || !image.current) return
    canvas.current.width = size.width
    canvas.current.height = size.height
    canvas.current.getContext('2d')?.drawImage(image.current, 0, 0)
  }, [still, size])

  if (!url || failedUrl === url) {
    return <span className="dn-sprite dn-sprite--missing">{name}</span>
  }
  const box: CSSProperties = size ? { width: size.width * factor, height: size.height * factor } : { visibility: 'hidden' }
  const fill: CSSProperties = { width: '100%', height: '100%' }
  return (
    <span className="dn-sprite" style={box} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : name}>
      <img
        ref={image}
        className="dn-sprite"
        src={url}
        alt=""
        style={{ ...fill, display: still ? 'none' : 'block' }}
        draggable={false}
        onLoad={(event) => setLoaded({ url, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onError={() => setFailedUrl(url)}
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

/** A Pokémon's small menu icon, by Pokédex number. */
export function PokemonIcon({ num, ...rest }: IconProps & { num: number }) {
  return <CellIcon cell={pokemonIconCell(num)} {...rest} />
}

/** An item's icon. */
export function ItemIconImage({ icon, ...rest }: IconProps & { icon: ItemIcon }) {
  return <CellIcon cell={itemIconCell(icon)} {...rest} />
}

/** The games' type label. `type` is the type's English name, as in the data pack. */
export function TypeIcon({ type, ...rest }: IconProps & { type: string }) {
  return <CellIcon cell={typeIconCell(type)} {...rest} />
}

/** The games' move-category label. */
export function CategoryIcon({ category, ...rest }: IconProps & { category: 'Physical' | 'Special' | 'Status' }) {
  return <CellIcon cell={categoryIconCell(category)} {...rest} />
}

export interface TypeLabelProps {
  /** The type's English name, as in the data pack: it picks the colour. */
  type: string
  /** The word shown, in the app's language. */
  text: string
}

/**
 * A type label drawn by the app, with the type's name in the app's language.
 * Showdown's own labels (TypeIcon) are images and exist in English only.
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
