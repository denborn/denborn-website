/**
 * Measures colours on a reference sheet.
 *
 *   node .claude/skills/denborn-da/tools/sheet-colors.ts <file.png>                 size and the most used colours
 *   node .claude/skills/denborn-da/tools/sheet-colors.ts <file.png> x y w h         the same, for one rectangle
 *   node .claude/skills/denborn-da/tools/sheet-colors.ts <file.png> x y w h --rows  the colours of each pixel row, top to bottom
 *
 * The sheets in tmp/ are other people's work and are never committed; this
 * tool only reads them, so that DESIGN.md can state measured values.
 * It reads the PNG kinds the sheets use: 8-bit, not interlaced, palette, RGB or RGBA.
 */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

interface Image {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel. */
  pixels: Uint8Array
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c
}

export function readPng(path: string): Image {
  const file = readFileSync(path)
  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  let palette: Uint8Array | undefined
  let transparency: Uint8Array | undefined
  const data: Uint8Array[] = []
  while (offset < file.length) {
    const length = file.readUInt32BE(offset)
    const type = file.toString('latin1', offset + 4, offset + 8)
    const body = file.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      colorType = body[9] ?? 0
      if (body[8] !== 8 || body[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNGs are supported')
    } else if (type === 'PLTE') palette = body
    else if (type === 'tRNS') transparency = body
    else if (type === 'IDAT') data.push(body)
    offset += length + 12
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`Unsupported PNG colour type ${colorType}`)
  const raw = inflateSync(Buffer.concat(data))
  const stride = width * channels
  const lines = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] ?? 0
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x] ?? 0
      const left = x >= channels ? (lines[y * stride + x - channels] ?? 0) : 0
      const up = y > 0 ? (lines[(y - 1) * stride + x] ?? 0) : 0
      const upLeft = y > 0 && x >= channels ? (lines[(y - 1) * stride + x - channels] ?? 0) : 0
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0
      lines[y * stride + x] = (value + predicted) & 255
    }
  }
  const pixels = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const at = (channel: number): number => lines[i * channels + channel] ?? 0
    let rgba: [number, number, number, number]
    if (colorType === 3) {
      const index = at(0)
      rgba = [palette?.[index * 3] ?? 0, palette?.[index * 3 + 1] ?? 0, palette?.[index * 3 + 2] ?? 0, transparency?.[index] ?? 255]
    } else if (colorType === 2) rgba = [at(0), at(1), at(2), 255]
    else if (colorType === 6) rgba = [at(0), at(1), at(2), at(3)]
    else if (colorType === 0) rgba = [at(0), at(0), at(0), 255]
    else rgba = [at(0), at(0), at(0), at(1)]
    pixels.set(rgba, i * 4)
  }
  return { width, height, pixels }
}

function hex(image: Image, x: number, y: number): string {
  const i = (y * image.width + x) * 4
  const [r = 0, g = 0, b = 0, a = 0] = image.pixels.subarray(i, i + 4)
  if (a === 0) return 'clear'
  return '#' + [r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')
}

const [path, ...rest] = process.argv.slice(2)
if (path) {
  const image = readPng(path)
  const numbers = rest.filter((arg) => !arg.startsWith('--')).map(Number)
  const [x0 = 0, y0 = 0, w = image.width - x0, h = image.height - y0] = numbers
  console.log(`${image.width} x ${image.height}`)
  if (rest.includes('--rows')) {
    for (let y = y0; y < y0 + h; y++) {
      const runs: string[] = []
      let last = ''
      let run = 0
      for (let x = x0; x < x0 + w; x++) {
        const colour = hex(image, x, y)
        if (colour === last) run++
        else {
          if (run) runs.push(`${last}×${run}`)
          last = colour
          run = 1
        }
      }
      runs.push(`${last}×${run}`)
      console.log(`y=${y}: ${runs.join(' ')}`)
    }
  } else {
    const counts = new Map<string, number>()
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) counts.set(hex(image, x, y), (counts.get(hex(image, x, y)) ?? 0) + 1)
    }
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 24)
    for (const [colour, count] of top) console.log(`${colour}  ${count}`)
  }
}
