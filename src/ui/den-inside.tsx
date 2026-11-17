import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react'
import { DEN_INSIDE } from '../data/sprites'
import { type Pixels, type Placement, type Rgb, caveInside, placeCave, rgbOf } from './cave'

/** How many colours the den's rocks have, in the tokens `--dn-den-inside-0` and on. */
const RAMP_COLOURS = 6

/** The cave once made, for the visit: back on the list, it is drawn at once. */
let made: Pixels | undefined

/** The den's rocks at night, as the tokens have them; nothing if one of them cannot be read. */
function rampOf(element: Element): Rgb[] | undefined {
  const style = getComputedStyle(element)
  const ramp = Array.from({ length: RAMP_COLOURS }, (_, nth) => rgbOf(style.getPropertyValue(`--dn-den-inside-${String(nth)}`)))
  return ramp.every((colour) => colour !== undefined) ? ramp : undefined
}

function draw(canvas: HTMLCanvasElement, pixels: Pixels): void {
  const target = canvas.getContext('2d')
  if (!target) return
  const drawn = target.createImageData(pixels.width, pixels.height)
  drawn.data.set(pixels.data)
  target.putImageData(drawn, 0, 0)
}

export interface DenInsideProps {
  /**
   * Where the one shown stands: a box centred on its feet, its bottom edge
   * the line they stand on. The cave is moved to bring its own spot under it
   * (decision 257). Without it, the cave fills the screen from its middle.
   */
  under?: HTMLElement | null | undefined
}

/**
 * The inside of the den, as the backdrop of a screen of `kind="den"`
 * (decisions 244, 253 and 257): Showdown's damp cave on its own pixels,
 * coloured as the den's own rocks at night (`cave.ts`), as large as just
 * covers the screen and moved to bring the oval its artist drew for a
 * Pokémon to stand on under the one shown, as far as covering allows; its
 * light falls there. It is made once and kept for the visit; nothing on it moves.
 * With no picture to be had the screen stays black.
 */
export function DenInside({ under }: DenInsideProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { url, width, height, spot } = DEN_INSIDE

  // Before the screen is first painted, when it was made already: the stripes that bring the screen in open on it whole.
  useLayoutEffect(() => {
    const element = canvas.current
    if (!element) return
    if (made) {
      draw(element, made)
      return
    }
    let current = true
    const image = new Image()
    image.onload = () => {
      const ramp = rampOf(element)
      const scratch = document.createElement('canvas')
      scratch.width = image.naturalWidth
      scratch.height = image.naturalHeight
      const source = scratch.getContext('2d', { willReadFrequently: true })
      if (!current || !ramp || !source) return
      source.drawImage(image, 0, 0)
      const served = source.getImageData(0, 0, scratch.width, scratch.height)
      made = caveInside({ data: served.data, width: served.width, height: served.height }, { width, height }, ramp, spot)
      draw(element, made)
    }
    image.src = url
    return () => {
      current = false
    }
  }, [url, width, height, spot])

  // Where it is drawn: read from the screen and from where the one shown stands, again whenever either changes size.
  const [placed, setPlaced] = useState<Placement>()
  useLayoutEffect(() => {
    const screen = canvas.current?.parentElement
    if (!screen) return
    const place = (): void => {
      const box = screen.getBoundingClientRect()
      const ground = under?.getBoundingClientRect()
      const feet = ground && { x: ground.left + ground.width / 2 - box.left, y: ground.bottom - box.top }
      const next = placeCave({ width: box.width, height: box.height }, { width, height }, spot, feet)
      setPlaced((was) => (was && was.pixel === next.pixel && was.left === next.left && was.top === next.top ? was : next))
    }
    const observer = new ResizeObserver(place)
    observer.observe(screen)
    if (under) observer.observe(under)
    return () => observer.disconnect()
  }, [under, width, height, spot])

  const style: CSSProperties | undefined = placed && { width: width * placed.pixel, height: height * placed.pixel, left: placed.left, top: placed.top }
  return <canvas ref={canvas} className="dn-den-inside" width={width} height={height} style={style} aria-hidden="true" />
}
