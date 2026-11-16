import { describe, expect, it } from 'vitest'
import { type SpriteStore, type WarmupProgress, warmSprites } from './sprite-warmup'

const urls = Array.from({ length: 10 }, (_, index) => `/sprites/${index}.gif`)

/** A store that keeps what it is asked to, unless the address is one that fails; it notes how many fetches ran at once. */
function store(kept: string[] = [], failing: (url: string) => boolean = () => false) {
  const asked: string[] = []
  let running = 0
  let most = 0
  const made: SpriteStore = {
    kept: () => Promise.resolve(kept),
    keep: async (url) => {
      asked.push(url)
      running += 1
      most = Math.max(most, running)
      // A fetch takes a moment: others start meanwhile.
      await new Promise((resolve) => setTimeout(resolve, 1))
      running -= 1
      if (failing(url)) throw new Error('no network')
      kept.push(url)
    },
  }
  return { made, asked, kept, most: () => most }
}

const options = (progress: WarmupProgress[] = []) => ({ atOnce: 3, giveUpAfter: 4, passes: 3, onProgress: (step: WarmupProgress) => progress.push(step) })

describe('fetching the sprites in the background', () => {
  it('fetches only what is not kept yet, a few at a time, and counts as it goes', async () => {
    const progress: WarmupProgress[] = []
    const cache = store(['/sprites/0.gif', '/sprites/7.gif'])
    expect(await warmSprites(urls, cache.made, options(progress))).toEqual({ done: 10, of: 10 })
    expect(cache.asked).toHaveLength(8)
    expect(cache.asked).not.toContain('/sprites/7.gif')
    expect(cache.most()).toBe(3)
    // Said at the start, with what was already there, then once per sprite kept.
    expect(progress.map((step) => step.done)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('leaves a sprite that keeps failing for the next call without stopping the others, and that call fetches it alone', async () => {
    let down = true
    const cache = store([], (url) => down && (url === '/sprites/2.gif' || url === '/sprites/5.gif'))
    expect(await warmSprites(urls, cache.made, options())).toEqual({ done: 8, of: 10 })
    // Tried once with the others, once more after them, then left: the second time brought nothing in.
    expect(cache.asked.filter((url) => url === '/sprites/2.gif')).toHaveLength(2)
    down = false
    cache.asked.length = 0
    expect(await warmSprites(urls, cache.made, options())).toEqual({ done: 10, of: 10 })
    expect(cache.asked.sort()).toEqual(['/sprites/2.gif', '/sprites/5.gif'])
  })

  it('fetches in the same call a sprite that failed while the network was coming back', async () => {
    // The first three asked for fail once: the network was not there yet. The others come in, then those three.
    const failedOnce = new Set<string>()
    const cache = store([], (url) => {
      const early = ['/sprites/0.gif', '/sprites/1.gif', '/sprites/2.gif'].includes(url) && !failedOnce.has(url)
      failedOnce.add(url)
      return early
    })
    expect(await warmSprites(urls, cache.made, options())).toEqual({ done: 10, of: 10 })
    expect(cache.asked).toHaveLength(13)
  })

  it('goes through what is missing a set number of times at most, even while each time brings one in', async () => {
    // Sprite 0 comes in the first time it is asked for, sprite 1 the second, sprite 2 the third, and so on.
    const asks = new Map<string, number>()
    const cache = store([], (url) => {
      const count = (asks.get(url) ?? 0) + 1
      asks.set(url, count)
      return count <= Number(/\d+/.exec(url)?.[0])
    })
    expect(await warmSprites(urls, cache.made, { ...options(), atOnce: 1, giveUpAfter: 100, passes: 3 })).toEqual({ done: 3, of: 10 })
    expect(cache.asked).toHaveLength(10 + 9 + 8)
  })

  it('gives up for now when the network is gone, without asking for every sprite', async () => {
    const cache = store([], () => true)
    expect(await warmSprites(urls, cache.made, options())).toEqual({ done: 0, of: 10 })
    // Four failures in a row are enough to know; the fetches already started with them are the only others.
    expect(cache.asked.length).toBeLessThan(urls.length)
    expect(cache.asked.length).toBeGreaterThanOrEqual(4)
  })

  it('counts a failure in a row only: a success in between starts the count over', async () => {
    // One at a time, every other one fails: never four in a row, so every sprite is tried.
    const cache = store([], (url) => Number(/\d+/.exec(url)?.[0]) % 2 === 0)
    expect(await warmSprites(urls, cache.made, { ...options(), atOnce: 1, passes: 1 })).toEqual({ done: 5, of: 10 })
    expect(cache.asked).toHaveLength(10)
  })

  it('asks next for what it never asked for, before what already failed', async () => {
    // Sprites 3 to 6 never come in: four failures in a row end the first pass before 7, 8 and 9 were asked for.
    const cache = store([], (url) => ['3', '4', '5', '6'].includes(/\d+/.exec(url)?.[0] ?? ''))
    expect(await warmSprites(urls, cache.made, { ...options(), atOnce: 1 })).toEqual({ done: 6, of: 10 })
    expect(cache.kept).toEqual(expect.arrayContaining(['/sprites/7.gif', '/sprites/8.gif', '/sprites/9.gif']))
  })

  it('stops asking once the page no longer wants them', async () => {
    const cache = store()
    let stopped = false
    const result = await warmSprites(urls, cache.made, { ...options(), onProgress: ({ done }) => (stopped = done >= 2), stopped: () => stopped })
    expect(result.done).toBeLessThan(10)
    expect(cache.asked.length).toBeLessThan(10)
  })

  it('has nothing to do when everything is kept', async () => {
    const cache = store([...urls])
    expect(await warmSprites(urls, cache.made, options())).toEqual({ done: 10, of: 10 })
    expect(cache.asked).toEqual([])
  })
})
