import { toSvgPath } from 'lean-qr/extras/svg'
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

/**
 * The same QR code drawn as lines instead of a picture, for paper: a printer
 * keeps lines sharp at any size, where it may blur a small picture it enlarges.
 */
export function PaperQrCode({ text, label, tooLong }: QrCodeProps) {
  const code = useMemo(() => qrFor(text), [text])
  if (!code) return <div className="dn-paper-qr dn-paper-qr--too-long">{tooLong}</div>
  const side = code.size + 2 * QUIET
  return (
    <svg className="dn-paper-qr" viewBox={`${-QUIET} ${-QUIET} ${side} ${side}`} shapeRendering="crispEdges" role="img" aria-label={label}>
      {/* Black on white whatever the paper's own colours: the same as on screen. */}
      <rect x={-QUIET} y={-QUIET} width={side} height={side} fill="#ffffff" />
      <path d={toSvgPath(code)} fill="#000000" />
    </svg>
  )
}
