/**
 * What reads the QR code in a camera's picture: the browser's own reader
 * where it has one, otherwise a bundled one (ZXing compiled to WebAssembly,
 * through the barcode-detector package), loaded only when a scan starts.
 *
 * The bundled reader's engine is a file of the app, served and cached with
 * it. Left alone, the package would fetch it from a CDN at the first scan:
 * the app fetches nothing from elsewhere while it runs, and scans offline.
 */
import engineUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

/** The part of the browsers' BarcodeDetector the app uses; the bundled reader has the same shape. */
interface Detector {
  detect(picture: HTMLVideoElement): Promise<{ rawValue: string }[]>
}

interface DetectorClass {
  new (options: { formats: string[] }): Detector
  getSupportedFormats(): Promise<readonly string[]>
}

const QR = 'qr_code'

/** What the QR code in a picture says; nothing when the picture shows none. */
export type QrReader = (picture: HTMLVideoElement) => Promise<string | undefined>

/** Fails when this browser has no reader of its own and the bundled one cannot be loaded. */
export async function loadQrReader(): Promise<QrReader> {
  const detector = (await ownDetector()) ?? (await bundledDetector())
  return async (picture) => (await detector.detect(picture))[0]?.rawValue
}

async function ownDetector(): Promise<Detector | undefined> {
  const Own = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector
  if (!Own) return undefined
  // A browser may have the reader and yet not read QR codes on this system.
  return (await Own.getSupportedFormats()).includes(QR) ? new Own({ formats: [QR] }) : undefined
}

async function bundledDetector(): Promise<Detector> {
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
  // Started now rather than at the first picture, so that a failure to load it is known before the camera is asked for.
  await prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? engineUrl : prefix + path) },
    fireImmediately: true,
  })
  return new BarcodeDetector({ formats: [QR] })
}
