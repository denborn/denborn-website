import { useEffect, useState } from 'react'
import { MISSING_SPRITE_URL, battleSpriteUrl } from '../data/sprites'
import type { SpeciesData } from '../data/types'
import { useScreenMetrics } from './Screen'
import { type Footprint, footprintOf, shadowOf } from './footprint'

/** What is read of a sprite: where its feet are and how wide it is, in its own pixels; `null` when nothing of it can be read. */
export type SpriteFeet = { feet: Footprint; width: number } | null
type Read = SpriteFeet

/** Each sprite read once, by its picture, for the visit. */
const read = new Map<string, Read>()

/** Reads a sprite's first frame, MissingNo.'s in its place when its own is not there. */
function readSprite(url: string): Promise<Read> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context || canvas.width === 0 || canvas.height === 0) {
        resolve(null)
        return
      }
      context.drawImage(image, 0, 0)
      const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height)
      const feet = footprintOf((x, y) => data[(y * width + x) * 4 + 3] ?? 0, width, height)
      resolve(feet ? { feet, width } : null)
    }
    image.onerror = () => {
      if (image.src.endsWith(MISSING_SPRITE_URL)) resolve(null)
      else image.src = MISSING_SPRITE_URL
    }
    image.src = url
  })
}

/**
 * Where a battle sprite's feet are, read once from its first frame and kept
 * for the visit (MissingNo.'s when its own is not there): `undefined` while
 * it is being read, `null` when nothing of it can be.
 */
export function useSpriteFeet(species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>, { back = false, female = false }: { back?: boolean; female?: boolean }): SpriteFeet | undefined {
  const url = battleSpriteUrl(species, { back, female }) ?? MISSING_SPRITE_URL
  const [, setRead] = useState(0)
  useEffect(() => {
    if (read.has(url)) return
    let current = true
    void readSprite(url).then((found) => {
      read.set(url, found)
      if (current) setRead((times) => times + 1)
    })
    return () => {
      current = false
    }
  }, [url])
  return read.get(url)
}

export interface SpriteShadowProps {
  species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>
  female?: boolean
  /** The sprite seen from behind: its feet are not where they are in front. */
  back?: boolean
  /** The sprite is drawn the other way round. */
  mirrored?: boolean
  /** One pixel of the sprite, in CSS pixels. */
  pixel: number
}

/**
 * The shadow under a Pokémon's battle sprite (decision 254): as wide as its
 * feet, a little more, and in their middle, read from the sprite's own
 * pixels, rather than as wide as its picture. It is placed from where the
 * sprite stands: the middle of its picture's bottom edge, which is where the
 * shadow is given its place. Nothing shows until the sprite is read.
 */
export function SpriteShadow({ species, female = false, back = false, mirrored = false, pixel }: SpriteShadowProps) {
  const { ratio } = useScreenMetrics()
  const known = useSpriteFeet(species, { back, female })
  if (!known) return null
  const shadow = shadowOf(known.feet, known.width, mirrored)
  const width = shadow.width * pixel
  const height = shadow.height * pixel
  // Its left edge on a whole pixel of the device, so that it does not blur.
  const left = Math.round((shadow.offset * pixel - width / 2) * ratio) / ratio
  return <span className="dn-sprite-shadow" style={{ width, height, left, bottom: -height / 2 }} aria-hidden="true" />
}
