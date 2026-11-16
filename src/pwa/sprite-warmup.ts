/**
 * The second stage of getting ready to work offline (decision 181): once the
 * app itself is kept, the battle sprites are fetched in the background, a few
 * at a time. Pure: the browser's cache and its network are handed in.
 *
 * Nothing here is all or nothing. A sprite that cannot be fetched is tried
 * again once the others are in, as long as some do come in; when none does,
 * the network is taken for gone and the rest waits for the next call. What is
 * already kept is never fetched again; meanwhile the interface shows
 * MissingNo. in the place of what is missing.
 */

/** Where the sprites are kept: the page fills it, the service worker serves from it. */
export interface SpriteStore {
  /** The addresses already kept. */
  kept(): Promise<readonly string[]>
  /** Fetches one sprite and keeps it; rejects when it could not. */
  keep(url: string): Promise<void>
}

export interface WarmupProgress {
  /** How many of the sprites are kept. */
  done: number
  of: number
}

export interface WarmupOptions {
  /** How many are fetched at the same time. */
  atOnce: number
  /** After this many failures in a row the network is taken for gone: the rest waits for the next try. */
  giveUpAfter: number
  /** How many times at most the sprites still missing are gone through in one call. */
  passes: number
  /** Told at the start and after each sprite kept. */
  onProgress: (progress: WarmupProgress) => void
  /** Asked before each fetch: true once the page no longer wants them. */
  stopped?: () => boolean
}

/** Fetches every sprite that is not kept yet, and says how many are kept in the end. */
export async function warmSprites(urls: readonly string[], store: SpriteStore, { atOnce, giveUpAfter, passes, onProgress, stopped }: WarmupOptions): Promise<WarmupProgress> {
  const have = new Set(await store.kept())
  let missing = urls.filter((url) => !have.has(url))
  let done = urls.length - missing.length
  onProgress({ done, of: urls.length })

  /** Goes once through what is missing, a few at a time, and gives back what could not be fetched. */
  const pass = async (todo: readonly string[]): Promise<string[]> => {
    const left: string[] = []
    let next = 0
    let failedInARow = 0
    const fetchInTurn = async (): Promise<void> => {
      for (;;) {
        const url = todo[next]
        if (url === undefined || stopped?.() || failedInARow >= giveUpAfter) return
        next += 1
        try {
          await store.keep(url)
          failedInARow = 0
          done += 1
          onProgress({ done, of: urls.length })
        } catch {
          // Still missing: the count says so, and it is tried again.
          failedInARow += 1
          left.push(url)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(atOnce, todo.length) }, fetchInTurn))
    // What was never asked for is still missing too, and comes before what already failed.
    return [...todo.slice(next), ...left]
  }

  for (let count = 0; count < passes && missing.length > 0 && !stopped?.(); count++) {
    const before = done
    missing = await pass(missing)
    // A pass that brought nothing in: the network is gone, and going through them again would change nothing.
    if (done === before) break
  }
  return { done, of: urls.length }
}
