/**
 * Reading and writing pictures for the scripts that cut the app's own
 * pictures out of larger ones. It reads the kinds of PNG the reference sheets
 * are (8 bits a channel, not interlaced: palette, grey, RGB or RGBA) and
 * writes RGBA.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { crc32, deflateSync, inflateSync } from 'node:zlib'

export interface Picture {
  width: number
  height: number
  /** RGBA, four bytes a pixel, row after row. */
  pixels: Uint8Array
}

export type Rgba = readonly [red: number, green: number, blue: number, alpha: number]

/** A rectangle of a picture, in its pixels. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft
  const [byLeft, byUp, byUpLeft] = [Math.abs(estimate - left), Math.abs(estimate - up), Math.abs(estimate - upLeft)]
  return byLeft <= byUp && byLeft <= byUpLeft ? left : byUp <= byUpLeft ? up : upLeft
}

export async function readPng(path: string): Promise<Picture> {
  const file = await readFile(path)
  if (!SIGNATURE.every((byte, index) => file[index] === byte)) throw new Error(`${path} is not a PNG`)
  let width = 0
  let height = 0
  let kind = 0
  let palette: Uint8Array | undefined
  let clear: Uint8Array | undefined
  const data: Uint8Array[] = []
  for (let offset = SIGNATURE.length; offset < file.length; ) {
    const length = file.readUInt32BE(offset)
    const type = file.toString('latin1', offset + 4, offset + 8)
    const body = file.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      kind = body[9] ?? 0
      if (body[8] !== 8 || body[12] !== 0) throw new Error(`${path}: only PNGs of 8 bits a channel, not interlaced, are read`)
    } else if (type === 'PLTE') palette = body
    else if (type === 'tRNS') clear = body
    else if (type === 'IDAT') data.push(body)
    offset += length + 12
  }
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number | undefined>)[kind]
  if (!channels) throw new Error(`${path}: a PNG of colour type ${kind} is not read`)
  const packed = inflateSync(Buffer.concat(data))
  const stride = width * channels
  const lines = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)] ?? 0
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? (lines[y * stride + x - channels] ?? 0) : 0
      const up = y > 0 ? (lines[(y - 1) * stride + x] ?? 0) : 0
      const upLeft = y > 0 && x >= channels ? (lines[(y - 1) * stride + x - channels] ?? 0) : 0
      const guess = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter] ?? 0
      lines[y * stride + x] = ((packed[y * (stride + 1) + 1 + x] ?? 0) + guess) & 255
    }
  }
  const pixels = new Uint8Array(width * height * 4)
  for (let index = 0; index < width * height; index++) {
    const at = (channel: number): number => lines[index * channels + channel] ?? 0
    const first = at(0)
    const colour: Rgba =
      kind === 3
        ? [palette?.[first * 3] ?? 0, palette?.[first * 3 + 1] ?? 0, palette?.[first * 3 + 2] ?? 0, clear?.[first] ?? 255]
        : kind === 2
          ? [first, at(1), at(2), 255]
          : kind === 6
            ? [first, at(1), at(2), at(3)]
            : [first, first, first, kind === 4 ? at(1) : 255]
    pixels.set(colour, index * 4)
  }
  return { width, height, pixels }
}

function chunk(type: string, body: Uint8Array): Buffer {
  const out = Buffer.alloc(body.length + 12)
  out.writeUInt32BE(body.length, 0)
  out.write(type, 4, 'latin1')
  out.set(body, 8)
  out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8)
  return out
}

/** The picture as the bytes of a PNG: the same picture always gives the same bytes. */
export function pngBytes(picture: Picture): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(picture.width, 0)
  header.writeUInt32BE(picture.height, 4)
  // 8 bits a channel, RGBA, and nothing else: no interlacing.
  header.set([8, 6, 0, 0, 0], 8)
  const stride = picture.width * 4
  const lines = Buffer.alloc(picture.height * (stride + 1))
  for (let y = 0; y < picture.height; y++) lines.set(picture.pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1)
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(lines, { level: 9 })), chunk('IEND', new Uint8Array())])
}

export async function writePng(path: string, picture: Picture): Promise<void> {
  await writeFile(path, pngBytes(picture))
}

/** A picture of that size with nothing on it. */
export function blank(width: number, height: number): Picture {
  return { width, height, pixels: new Uint8Array(width * height * 4) }
}

export function pixelAt(picture: Picture, x: number, y: number): Rgba {
  const at = (y * picture.width + x) * 4
  return [picture.pixels[at] ?? 0, picture.pixels[at + 1] ?? 0, picture.pixels[at + 2] ?? 0, picture.pixels[at + 3] ?? 0]
}

export function setPixel(picture: Picture, x: number, y: number, colour: Rgba): void {
  picture.pixels.set(colour, (y * picture.width + x) * 4)
}

/** A rectangle of a picture, as a picture of its own. */
export function cut(picture: Picture, rect: Rect): Picture {
  const out = blank(rect.width, rect.height)
  for (let y = 0; y < rect.height; y++) {
    const from = ((rect.y + y) * picture.width + rect.x) * 4
    out.pixels.set(picture.pixels.subarray(from, from + rect.width * 4), y * rect.width * 4)
  }
  return out
}

/** Puts a picture onto another, its top left corner at `x` and `y`. */
export function paste(onto: Picture, piece: Picture, x: number, y: number): void {
  for (let row = 0; row < piece.height; row++) {
    onto.pixels.set(piece.pixels.subarray(row * piece.width * 4, (row + 1) * piece.width * 4), ((y + row) * onto.width + x) * 4)
  }
}

export const sameColour = (a: Rgba, b: Rgba): boolean => a.every((value, index) => value === b[index])
