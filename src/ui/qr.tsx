import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { qrFor } from './qr-size'

/** Squares of quiet, white border a QR code needs around it to be read. */
const QUIET = 4

export interface QrCodeProps {
  /** What the QR code holds. */
  text: string
  /** What it is, for assistive technology. */
  label: string
  /** Shown in its place when the text would need a finer QR code than the app shows (decision 99). */
  tooLong: ReactNode
}

/**
 * A QR code, always black on white with its quiet border, whatever the screen
 * around it looks like: that is what cameras read best. It is as wide as its
 * container.
 */
export function QrCode({ text, label, tooLong }: QrCodeProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const code = useMemo(() => qrFor(text), [text])

  useEffect(() => {
    if (code && canvas.current) code.toCanvas(canvas.current, { on: [0, 0, 0, 255], off: [255, 255, 255, 255], pad: QUIET })
  }, [code])

  if (!code) return <div className="dn-qr dn-qr--too-long">{tooLong}</div>
  return <canvas ref={canvas} className="dn-qr" role="img" aria-label={label} />
}
