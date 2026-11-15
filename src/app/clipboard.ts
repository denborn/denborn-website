/** Puts a text on the device's clipboard. False when the browser refuses: the screen then shows the text to copy by hand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Refused (no permission, an insecure page, an old browser): reported to the caller, which says so on screen.
    return false
  }
}
