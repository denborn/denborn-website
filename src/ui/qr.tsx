import { type Bitmap2D, correction, generate } from 'lean-qr'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'

/** Modules of quiet, white border a QR code needs around it to be read. */
const QUIET = 4

function encode(text: string): Bitmap2D | undefined {
  try {
    // The lowest error correction: the code is read from a clean screen or a fresh print, and smaller is easier to scan.
    return generate(text, { minCorrectionLevel: correction.L })
  } catch {
    // The library throws when no QR code is large enough for the text.
    return undefined
  }
}

/** Side of the QR code that holds a text, in modules, without its border; nothing when no QR code can hold it. */
export function qrSide(text: string): number | undefined {
  return encode(text)?.size
}

export interface QrCodeProps {
  /** What the QR code holds. */
  text: string
  /** What it is, for assistive technology. */
  label: string
  /** Shown in its place when the text is too long for any QR code. */
  tooLong: ReactNode
}

/**
 * A QR code, always black on white with its quiet border, whatever the screen
 * around it looks like: that is what cameras read best. It is as wide as its
 * container.
 */
export function QrCode({ text, label, tooLong }: QrCodeProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const code = useMemo(() => encode(text), [text])

  useEffect(() => {
    if (code && canvas.current) code.toCanvas(canvas.current, { on: [0, 0, 0, 255], off: [255, 255, 255, 255], pad: QUIET })
  }, [code])

  if (!code) return <div className="dn-qr dn-qr--too-long">{tooLong}</div>
  return <canvas ref={canvas} className="dn-qr" role="img" aria-label={label} />
}
