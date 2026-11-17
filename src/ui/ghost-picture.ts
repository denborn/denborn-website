import { useEffect, useRef, useState } from 'react'
import { MISSING_SPRITE_URL, battleSpriteUrl } from '../data/sprites'
import type { SpeciesData } from '../data/types'
import { GHOST, chanceOf, driftOf, glowAt, swayAt, waveAt } from './ghost'

/** How far round a ghost its glow reaches, in its own pixels. */
export const GLOW = 3
/** How much of a ghost's own colours its glow's colour takes, and how much of the ghost shows. */
const GHOST_TINT = 0.35
const GHOST_SHOWS = 0.85

/** A ghost's picture, ready to draw: its sprite in the glow's tint, and its glow, each on a sheet of its own of the same size. */
export interface GhostPicture {
  body: HTMLCanvasElement
  glow: HTMLCanvasElement
  /** The sprite's own size, in its pixels; the sheets have `GLOW` more on every side. */
  width: number
  height: number
}

/** Reads a sprite's first frame and makes the ghost's picture of it, the glow in `colour`. Nothing if the browser will not draw. */
function pictureOf(image: HTMLImageElement, colour: string): GhostPicture | undefined {
  const width = image.naturalWidth
  const height = image.naturalHeight
  const sheet = (): HTMLCanvasElement => {
    const made = document.createElement('canvas')
    made.width = width + 2 * GLOW
    made.height = height + 2 * GLOW
    return made
  }
  const body = sheet()
  const glow = sheet()
  const onBody = body.getContext('2d', { willReadFrequently: true })
  const onGlow = glow.getContext('2d')
  if (!onBody || !onGlow || width === 0 || height === 0) return undefined
  onBody.drawImage(image, GLOW, GLOW)
  const drawn = onBody.getImageData(0, 0, body.width, body.height).data
  const solid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < body.width && y < body.height && (drawn[(y * body.width + x) * 4 + 3] ?? 0) > 0
  // The glow: every pixel outside the sprite and within `GLOW` of it, fainter with the distance.
  onGlow.fillStyle = colour
  for (let y = 0; y < glow.height; y++) {
    for (let x = 0; x < glow.width; x++) {
      if (solid(x, y)) continue
      let nearest = Infinity
      for (let down = -GLOW; down <= GLOW; down++) {
        for (let across = -GLOW; across <= GLOW; across++) {
          if (solid(x + across, y + down)) nearest = Math.min(nearest, Math.max(Math.abs(across), Math.abs(down)))
        }
      }
      if (nearest > GLOW) continue
      onGlow.globalAlpha = 1 - (nearest - 1) / GLOW
      onGlow.fillRect(x, y, 1, 1)
    }
  }
  // The sprite takes some of the glow's colour, where it is drawn and nowhere else.
  onBody.globalCompositeOperation = 'source-atop'
  onBody.globalAlpha = GHOST_TINT
  onBody.fillStyle = colour
  onBody.fillRect(0, 0, body.width, body.height)
  return { body, glow, width, height }
}

/**
 * The ghost's picture of a Pokémon: its sprite's first frame, read once,
 * tinted and given a glow in the colour `colourOf` reads when the sprite is
 * there. Its sprite not there, MissingNo.'s ghost stands in its place.
 * `undefined` while it is being made, `null` when none can be.
 */
export function useGhostPicture(species: Pick<SpeciesData, 'id' | 'sprite' | 'femaleSprite'>, female: boolean, colourOf: () => string | undefined): GhostPicture | null | undefined {
  const [made, setMade] = useState<{ of: string; picture: GhostPicture | null }>()
  // The colour is read once the sprite is there; a new reader alone does not make the picture again.
  const reader = useRef(colourOf)
  useEffect(() => {
    reader.current = colourOf
  })
  const own = battleSpriteUrl(species, { female })
  const key = own ?? MISSING_SPRITE_URL
  useEffect(() => {
    let current = true
    const image = new Image()
    image.onload = () => {
      const colour = reader.current()
      if (!current || colour === undefined) return
      setMade({ of: key, picture: pictureOf(image, colour) ?? null })
    }
    image.onerror = () => {
      if (!current) return
      if (image.src.endsWith(MISSING_SPRITE_URL)) setMade({ of: key, picture: null })
      else image.src = MISSING_SPRITE_URL
    }
    image.src = key
    return () => {
      current = false
    }
  }, [key])
  return made?.of === key ? made.picture : undefined
}

/** The size of a ghost's sheet, in its own pixels: its picture with its glow, room to sway `reach` and waver on either side, room over it for its squares to drift. */
export function ghostSheetOf(picture: GhostPicture, reach: number): { width: number; height: number } {
  return { width: picture.body.width + 2 * (reach + 1), height: picture.body.height + GHOST.drift }
}

/**
 * Draws a ghost on its sheet as it is `elapsed` milliseconds after it came:
 * swayed as far as `reach` to either side, its rows wavering, its glow coming
 * and going, broken up by `gone` (0 whole, 1 gone) in squares that drift up.
 */
export function drawGhost(on: CanvasRenderingContext2D, picture: GhostPicture, { elapsed, reach, gone }: { elapsed: number; reach: number; gone: number }): void {
  const sheet = ghostSheetOf(picture, reach)
  const sway = swayAt(elapsed, reach)
  on.clearRect(0, 0, sheet.width, sheet.height)
  for (const [layer, shows] of [
    [picture.glow, glowAt(elapsed)],
    [picture.body, GHOST_SHOWS],
  ] as const) {
    on.globalAlpha = shows
    for (let y = 0; y < layer.height; y += GHOST.square) {
      const wave = waveAt(y / GHOST.square, elapsed)
      for (let x = 0; x < layer.width; x += GHOST.square) {
        const up = driftOf(chanceOf(x / GHOST.square, y / GHOST.square), gone)
        if (up === undefined) continue
        on.drawImage(layer, x, y, GHOST.square, GHOST.square, reach + 1 + x + sway + wave, GHOST.drift + y - up, GHOST.square, GHOST.square)
      }
    }
  }
}
