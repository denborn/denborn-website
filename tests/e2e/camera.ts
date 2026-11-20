/**
 * The pictures Chromium's pretend camera shows during the scanning tests:
 * each a short video file of one QR code, black on white. One is the link of
 * a character of the tests' campaign, as its sheet would show it; the other
 * the creation link of that campaign, as its game master's page shows it.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from 'lean-qr'
import { encodeCharacterCode, qrForm } from '../../src/shared/codec/codes.ts'
import { code, pikachu } from './creating.ts'

/** Where the video files are written: a cache folder that is never committed. */
export const CAMERA_PICTURE = fileURLToPath(new URL('../../node_modules/.cache/denborn/e2e-camera.y4m', import.meta.url))
export const CAMPAIGN_CAMERA_PICTURE = fileURLToPath(new URL('../../node_modules/.cache/denborn/e2e-camera-campaign.y4m', import.meta.url))

/** The character the camera sees. */
export const SCANNED_NICKNAME = 'Scanette'

/** White border a QR code needs around it, in squares. */
const QUIET = 4
/** Luma of white and of black in video (the limited range), and the chroma of no colour at all. */
const WHITE = 235
const BLACK = 16
const NO_COLOUR = 128

/** A Y4M video of `frames` identical square pictures of the QR code that holds `text`. */
function qrVideo(text: string, side: number, frames: number): Buffer {
  const code = generate(text)
  const scale = Math.floor(side / (code.size + 2 * QUIET))
  if (scale < 3) throw new Error('The QR code is too fine for the picture: make the picture larger.')
  const edge = Math.floor((side - code.size * scale) / 2)
  const luma = Buffer.alloc(side * side, WHITE)
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (!code.get(x, y)) continue
      for (let row = 0; row < scale; row++) luma.fill(BLACK, (edge + y * scale + row) * side + edge + x * scale, (edge + y * scale + row) * side + edge + (x + 1) * scale)
    }
  }
  // Two colour planes at half the size each way, both empty.
  const chroma = Buffer.alloc((side * side) / 2, NO_COLOUR)
  const picture = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma])
  return Buffer.concat([Buffer.from(`YUV4MPEG2 W${side} H${side} F30:1 Ip A1:1 C420jpeg\n`), ...Array.from({ length: frames }, () => picture)])
}

export function writeCameraPicture(): void {
  const link = qrForm(encodeCharacterCode(pikachu(SCANNED_NICKNAME, 'e2eScanned000001')), 'https://denborn.example')
  mkdirSync(dirname(CAMERA_PICTURE), { recursive: true })
  writeFileSync(CAMERA_PICTURE, qrVideo(link, 720, 3))
  writeFileSync(CAMPAIGN_CAMERA_PICTURE, qrVideo(qrForm(code, 'https://denborn.example'), 720, 3))
}
