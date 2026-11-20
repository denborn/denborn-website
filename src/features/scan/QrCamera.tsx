import { useEffect, useEffectEvent, useRef } from 'react'
import type { CameraProblem, CameraProps } from './camera'
import { type QrReader, loadQrReader } from './qr-reader'

/** Time between two looks at the picture, in milliseconds: quick enough to feel instant, slow enough to spare the battery. */
const LOOK_EVERY = 250
/** Looks that may fail in a row before the reader is given up on: about five seconds. */
const FAILED_LOOKS_MAX = 20
/** A video's `readyState` from which it has a picture to show. */
const HAS_PICTURE = 2

function cameraProblem(error: unknown): CameraProblem {
  // The browser, the system or the user said no; anything else means no camera could be opened.
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? 'denied' : 'none'
}

function stop(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

/**
 * The camera's picture, looked at a few times a second until a QR code is
 * read. The camera is on only while this is on the page: leaving it turns it
 * off. It says why when there is no camera to use or no way to read a code.
 */
export function QrCamera({ onText, onProblem }: CameraProps) {
  const video = useRef<HTMLVideoElement>(null)
  const found = useEffectEvent(onText)
  const failed = useEffectEvent(onProblem)

  useEffect(() => {
    const picture = video.current
    if (!picture) return
    let over = false
    let stream: MediaStream | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let failedLooks = 0

    const look = async (read: QrReader): Promise<void> => {
      let text: string | undefined
      try {
        text = picture.readyState >= HAS_PICTURE ? await read(picture) : undefined
        failedLooks = 0
      } catch {
        // One picture that cannot be read is nothing; a reader that never can is said to the user below.
        failedLooks++
      }
      if (over) return
      if (text) found(text)
      else if (failedLooks >= FAILED_LOOKS_MAX) failed('unsupported')
      else timer = setTimeout(() => void look(read), LOOK_EVERY)
    }

    const start = async (): Promise<void> => {
      // Absent on a page not served securely, and in browsers without camera access.
      const devices = navigator.mediaDevices as MediaDevices | undefined
      if (!devices) {
        failed('unsupported')
        return
      }
      let read: QrReader
      try {
        read = await loadQrReader()
      } catch {
        if (!over) failed('unsupported')
        return
      }
      try {
        // The camera on the back of a phone, when there is a choice.
        stream = await devices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch (error) {
        if (!over) failed(cameraProblem(error))
        return
      }
      if (over) {
        stop(stream)
        return
      }
      picture.srcObject = stream
      try {
        await picture.play()
      } catch {
        // Interrupted because the page moved on: the cleanup below has already run.
        return
      }
      void look(read)
    }
    void start()

    return () => {
      over = true
      clearTimeout(timer)
      if (stream) stop(stream)
      picture.srcObject = null
    }
  }, [])

  // Muted and inline: what phones require before a video may start by itself.
  return <video ref={video} muted playsInline />
}
