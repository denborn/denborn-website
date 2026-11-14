/**
 * The parts of storage that need a real browser: its storage, saving a file
 * to the device, reading one the user picked. Kept apart so that everything
 * else can be tested without one.
 */
import { type FileToSave, MAX_FILE_LENGTH } from './files.ts'
import type { KeyValue } from './library.ts'

/** The browser's storage, or nothing when the browser refuses access to it (private mode, site data disabled). */
export function browserStorage(): KeyValue | undefined {
  try {
    const probe = 'denborn/probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return localStorage
  } catch {
    // Refused or full: the caller says so on screen and works from files only.
    return undefined
  }
}

/** Hands a file to the browser to save on the device. */
export function saveToDevice(file: FileToSave): void {
  const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
}

/** The text of a file the user picked, or nothing when it is larger than any Denborn file. */
export async function textOfPickedFile(file: File): Promise<string | undefined> {
  // A character in UTF-8 takes at most 4 bytes: a file past this cannot be within the limit.
  if (file.size > MAX_FILE_LENGTH * 4) return undefined
  return file.text()
}
