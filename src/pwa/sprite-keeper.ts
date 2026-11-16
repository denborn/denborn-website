/**
 * Keeps at it until every battle sprite is kept for offline use (decision
 * 181). One try fetches what is missing (sprite-warmup.ts). A try that leaves
 * some missing is followed by others: at once when the network came back
 * meanwhile, otherwise after a wait that grows, a few times; then it waits
 * for the network to come back, or for the next visit.
 *
 * A network that "is back" is not always there yet for the first requests:
 * the waits are what makes its return reliable. Pure: the store, the clock
 * and the device's word on its network are handed in.
 */
import { type SpriteStore, type WarmupProgress, warmSprites } from './sprite-warmup.ts'

export interface KeptSprites extends WarmupProgress {
  /** True while some are missing and nothing is being fetched: the network is gone, or the tries ran out. */
  stalled: boolean
}

export interface KeeperOptions {
  /** The sprites there are to keep. Asked at each try: the game data may not be loaded yet at the first. */
  urls: () => Promise<readonly string[]>
  store: SpriteStore
  /** Whether the device believes it has a network. Without one, no try is planned: its return starts the next. */
  online: () => boolean
  /** How long to wait before each further try after one that brought nothing in, in milliseconds. */
  retryAfter: readonly number[]
  /** Runs something later, and gives back the way to call it off. */
  later: (run: () => void, ms: number) => () => void
  onState: (state: KeptSprites) => void
  /** Told once every sprite is kept. */
  onComplete: () => void
  atOnce: number
  giveUpAfter: number
  passes: number
  /** The count is told at once the first time of each try, then every so many sprites. */
  toldEvery: number
}

export interface SpriteKeeper {
  /** The device says its network is back: what is missing is fetched now, and the waits start over. */
  networkBack: () => void
  /** The page no longer wants them. */
  stop: () => void
}

export function keepSprites(options: KeeperOptions): SpriteKeeper {
  const state = { stopped: false, fetching: false, again: false, triesLeft: options.retryAfter.length, callOff: undefined as (() => void) | undefined }
  // Asked through functions: both flags are raised from outside, between two awaits.
  const cameBack = (): boolean => state.again
  const stopped = (): boolean => state.stopped

  const attempt = async (): Promise<void> => {
    if (state.fetching) {
      state.again = true
      return
    }
    state.fetching = true
    try {
      do {
        state.again = false
        const urls = await options.urls()
        let told = false
        let before: number | undefined
        const kept = await warmSprites(urls, options.store, {
          atOnce: options.atOnce,
          giveUpAfter: options.giveUpAfter,
          passes: options.passes,
          stopped,
          onProgress: (progress) => {
            before ??= progress.done
            if (stopped() || (told && progress.done % options.toldEvery !== 0 && progress.done !== progress.of)) return
            told = true
            options.onState({ ...progress, stalled: false })
          },
        })
        if (stopped()) return
        if (kept.done === kept.of) {
          options.onState({ ...kept, stalled: false })
          options.onComplete()
          return
        }
        // Some came in: the network is there, and the waits start over.
        if (before !== undefined && kept.done > before) state.triesLeft = options.retryAfter.length
        if (cameBack()) continue
        options.onState({ ...kept, stalled: true })
        const wait = options.retryAfter[options.retryAfter.length - state.triesLeft]
        if (wait !== undefined && options.online()) {
          state.triesLeft -= 1
          state.callOff = options.later(() => void attempt(), wait)
        }
      } while (cameBack())
    } catch {
      // The game data or the browser's cache could not be read: said as stalled, and tried again like any other try.
      if (!stopped()) options.onState({ done: 0, of: 0, stalled: true })
    } finally {
      state.fetching = false
    }
  }

  void attempt()
  return {
    networkBack: () => {
      state.callOff?.()
      state.triesLeft = options.retryAfter.length
      void attempt()
    },
    stop: () => {
      state.stopped = true
      state.callOff?.()
    },
  }
}
