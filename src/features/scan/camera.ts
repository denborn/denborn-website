/** Why the camera cannot be used: refused by the user or the browser, absent, or no way to read a QR code here. */
export type CameraProblem = 'denied' | 'none' | 'unsupported'

/** What a screen gives the camera it shows: where to send what is read, and what went wrong. */
export interface CameraProps {
  /** What a QR code in the picture says. */
  onText: (text: string) => void
  onProblem: (problem: CameraProblem) => void
}
