/**
 * Which QR code holds a text, and whether the app may show it.
 *
 * Decision 99: the largest QR code shown is 101 × 101 squares, the finest the
 * owner's phone read quickly. A longer text gets no QR code: the app offers
 * the file, or the link as text, instead.
 */
import { type Bitmap2D, correction, generate } from 'lean-qr'

/** A QR code of version v has 17 + 4v squares a side: 101 squares is version 21. */
export const QR_MAX_SIDE = 101
const MAX_VERSION = (QR_MAX_SIDE - 17) / 4

/** The QR code for a text, or nothing when the text needs one finer than allowed. */
export function qrFor(text: string): Bitmap2D | undefined {
  try {
    // The lowest error correction: the code is read from a clean screen or a fresh print, and smaller is easier to scan.
    return generate(text, { minCorrectionLevel: correction.L, maxVersion: MAX_VERSION })
  } catch {
    // The library throws when the text does not fit the largest version allowed.
    return undefined
  }
}

/** Side of the QR code that holds a text, in squares, without its border; nothing when it would be finer than allowed. */
export function qrSide(text: string): number | undefined {
  return qrFor(text)?.size
}
