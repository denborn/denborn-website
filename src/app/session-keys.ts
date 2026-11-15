/** What this device keeps to find its place in a session again, over the browser's storage (or the page's memory when the browser refuses its own). */
import { browserStorage } from '../storage/browser'
import { memoryStorage } from '../storage/library'
import { openSessionKeys } from '../storage/session-keys'

export const sessionKeys = openSessionKeys(browserStorage() ?? memoryStorage(), (length) => crypto.getRandomValues(new Uint8Array(length)))
