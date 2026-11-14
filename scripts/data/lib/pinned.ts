/**
 * Downloading files from a pinned version of a public repository.
 *
 * Nothing that belongs to someone else is committed here. Each source has a
 * lock file (data-sources/*.lock.json) that names the exact version and the
 * SHA-256 of every file taken from it. Files are downloaded into a
 * git-ignored cache and checked against the lock, so a build either gets
 * exactly the pinned bytes or stops.
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const ROOT = new URL('../../../', import.meta.url).pathname
export const CACHE = join(ROOT, '.cache')

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

/** Writes JSON with sorted keys and a final line break, so that the same data always gives the same file. */
export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, stableJson(value) + '\n')
}

export function stableJson(value: unknown, indent = 2): string {
  return JSON.stringify(sortKeys(value), null, indent)
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, inner]) => [key, sortKeys(inner)]),
    )
  }
  return value
}

/** Thrown when the server says the file does not exist. */
export class NotFoundError extends Error {}

async function download(url: string): Promise<Uint8Array> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'denborn-build (https://github.com/denborn/denborn-website)' } })
      // A missing file is a definite answer; anything else may be a passing failure and is tried again.
      if (response.status === 404) throw new NotFoundError(`${url} does not exist`)
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      return new Uint8Array(await response.arrayBuffer())
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }
  throw new Error(`Could not download ${url}: ${String(lastError)}`)
}

export interface PinnedFile {
  url: string
  /** Where the file is kept in the cache. */
  path: string
  /** Expected SHA-256, or undefined when the file is being pinned for the first time. */
  sha256: string | undefined
}

/**
 * Makes sure the file is in the cache with the expected content and returns its
 * SHA-256. A file whose content differs from the lock is an error, never a
 * silent update.
 */
export async function ensureFile(file: PinnedFile): Promise<string> {
  if (existsSync(file.path)) {
    const cached = sha256(await readFile(file.path))
    if (file.sha256 === undefined || cached === file.sha256) return cached
  }
  const bytes = await download(file.url)
  const actual = sha256(bytes)
  if (file.sha256 !== undefined && actual !== file.sha256) {
    throw new Error(`${file.url}\n  has SHA-256 ${actual}\n  but the lock file expects ${file.sha256}`)
  }
  await mkdir(dirname(file.path), { recursive: true })
  await writeFile(file.path, bytes)
  return actual
}

/** Runs `task` over `items`, a few at a time, to stay polite with the servers. */
export async function inBatches<T, R>(items: readonly T[], size: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(task))))
  }
  return results
}
