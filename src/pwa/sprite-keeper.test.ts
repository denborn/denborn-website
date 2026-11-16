import { describe, expect, it } from 'vitest'
import { type KeptSprites, keepSprites } from './sprite-keeper'
import type { SpriteStore } from './sprite-warmup'

const urls = Array.from({ length: 6 }, (_, index) => `/sprites/${index}.gif`)
const settled = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 30))

/** A keeper at a table the test controls: whether the network answers, whether the device thinks it has one, and the clock. */
function table({ network = true, online = true, retryAfter = [10, 20], giveUpAfter = 3, atOnce = 2 }: { network?: boolean; online?: boolean; retryAfter?: number[]; giveUpAfter?: number; atOnce?: number } = {}) {
  /** `answers`: how many more sprites the network gives before it goes; left out, as many as asked. */
  const world: { network: boolean; online: boolean; answers?: number } = { network, online }
  const kept: string[] = []
  const asked: string[] = []
  const states: KeptSprites[] = []
  const planned: { run: () => void; ms: number; calledOff: boolean }[] = []
  let completed = 0
  const store: SpriteStore = {
    kept: () => Promise.resolve([...kept]),
    keep: async (url) => {
      asked.push(url)
      // Whether it answers is settled when the request leaves; the answer takes a moment to come.
      const answers = world.network && world.answers !== 0
      if (answers && world.answers !== undefined) world.answers -= 1
      await new Promise((resolve) => setTimeout(resolve, 1))
      if (!answers) throw new Error('no network')
      kept.push(url)
    },
  }
  const keeper = keepSprites({
    urls: () => Promise.resolve(urls),
    store,
    online: () => world.online,
    retryAfter,
    later: (run, ms) => {
      const plan = { run, ms, calledOff: false }
      planned.push(plan)
      return () => (plan.calledOff = true)
    },
    onState: (state) => states.push(state),
    onComplete: () => (completed += 1),
    atOnce,
    giveUpAfter,
    passes: 2,
    toldEvery: 1,
  })
  /** The clock reaches the next try that was planned and not called off. */
  const tick = async (): Promise<number | undefined> => {
    const plan = planned.find((entry) => !entry.calledOff)
    if (!plan) return undefined
    plan.calledOff = true
    plan.run()
    await settled()
    return plan.ms
  }
  return { world, keeper, kept, asked, states, planned, tick, completed: () => completed, last: () => states.at(-1) }
}

describe('keeping at it until every sprite is kept', () => {
  it('keeps them all at the first try when the network is there, and says so once', async () => {
    const at = table()
    await settled()
    expect(at.last()).toEqual({ done: 6, of: 6, stalled: false })
    expect(at.completed()).toBe(1)
    expect(at.planned).toEqual([])
  })

  it('tries again after a wait when a network that should be there does not answer, and succeeds once it does', async () => {
    const at = table({ network: false })
    await settled()
    expect(at.last()).toEqual({ done: 0, of: 6, stalled: true })
    at.world.network = true
    expect(await at.tick()).toBe(10)
    expect(at.last()).toEqual({ done: 6, of: 6, stalled: false })
    expect(at.completed()).toBe(1)
  })

  it('waits longer each time, a set number of times, then waits for the network to come back', async () => {
    const at = table({ network: false })
    await settled()
    expect(await at.tick()).toBe(10)
    expect(await at.tick()).toBe(20)
    expect(await at.tick()).toBeUndefined()
    expect(at.last()).toEqual({ done: 0, of: 6, stalled: true })
    // Its return starts a try at once, and the waits over.
    at.keeper.networkBack()
    await settled()
    expect(await at.tick()).toBe(10)
  })

  it('plans no try while the device says it has no network: its return starts the next', async () => {
    const at = table({ network: false, online: false })
    await settled()
    expect(at.last()?.stalled).toBe(true)
    expect(at.planned).toEqual([])
    at.world.network = true
    at.world.online = true
    at.keeper.networkBack()
    await settled()
    expect(at.completed()).toBe(1)
  })

  it('calls off the wait it had planned when the network comes back first, and when the page stops', async () => {
    const back = table({ network: false })
    await settled()
    back.world.network = true
    back.keeper.networkBack()
    await settled()
    expect(back.planned[0]?.calledOff).toBe(true)
    expect(back.completed()).toBe(1)

    const stopped = table({ network: false })
    await settled()
    stopped.keeper.stop()
    expect(stopped.planned[0]?.calledOff).toBe(true)
  })

  it('fetches again at once, with no wait, when the network came back while a try was failing', async () => {
    // One request at a time, and one failure is enough to give a try up.
    const at = table({ network: false, giveUpAfter: 1, atOnce: 1 })
    // The first request has left and will fail; the network returns before it has.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(at.asked).toHaveLength(1)
    at.world.network = true
    at.keeper.networkBack()
    await settled()
    // The try that was failing ended with nothing; the one after it, started at once, kept them all.
    expect(at.completed()).toBe(1)
    expect(at.planned).toEqual([])
    expect(at.states.some((state) => state.stalled)).toBe(false)
  })

  it('starts the waits over once some sprites came in', async () => {
    const at = table({ network: false })
    await settled()
    // The first wait is used up; then the network answers for two sprites before it goes again.
    at.world.network = true
    at.world.answers = 2
    expect(await at.tick()).toBe(10)
    expect(at.last()).toEqual({ done: 2, of: 6, stalled: true })
    // Something came in, so the next wait is the first one again, not the longer one.
    expect(await at.tick()).toBe(10)
    expect(await at.tick()).toBe(20)
  })
})
