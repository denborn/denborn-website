import { type Page, expect, test } from '@playwright/test'
import { settled } from './accessible.ts'

/** Where the two screens of the Options are in the window, the top one first. */
async function screens(page: Page) {
  const both = page.getByRole('region', { name: 'Options', exact: true })
  await expect(both).toHaveCount(2)
  const top = await both.first().boundingBox()
  const bottom = await both.last().boundingBox()
  if (!top || !bottom) throw new Error('A screen of the Options is not drawn.')
  return { top, bottom }
}

test('the app is two 4:3 screens, whole inside the window, and a long page scrolls inside the bottom one', async ({ page }) => {
  await page.goto('/options')
  const { top, bottom } = await screens(page)
  for (const screen of [top, bottom]) expect(screen.width / screen.height).toBeCloseTo(4 / 3, 2)
  expect(top.y).toBeGreaterThanOrEqual(0)
  expect(bottom.y).toBeCloseTo(top.y + top.height, 0)
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)

  // The last thing of the Options is past the bottom screen's edge: it is reached inside that screen, and nothing else moves.
  const last = page.getByRole('button', { name: 'CREDITS' })
  await expect(last).not.toBeInViewport()
  await last.scrollIntoViewIfNeeded()
  await expect(last).toBeInViewport()
  expect(await page.evaluate<number>('window.scrollY')).toBe(0)
  expect(await screens(page)).toEqual({ top, bottom })
})

test('a window too short for screens as wide as the phone shows them smaller, both still whole', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 520 })
  await page.goto('/options')
  const { top, bottom } = await screens(page)
  expect(top.width).toBeLessThan(412)
  expect(top.width / top.height).toBeCloseTo(4 / 3, 2)
  // In the middle of the window, black on either side.
  expect(top.x).toBeCloseTo((412 - top.width) / 2, 0)
  expect(top.y).toBeGreaterThanOrEqual(0)
  expect(bottom.y + bottom.height).toBeLessThanOrEqual(520)
})

test('from the Options to the credits the top screen is the same one, carried on, and only the bottom one is replaced', async ({ page }) => {
  await page.goto('/options')
  // Both screens are there, so that the first is the top one: it is marked, to be known again. Asked in the page's own words:
  // the tests know no browser types.
  await expect(page.getByRole('region', { name: 'Options', exact: true })).toHaveCount(2)
  await page.evaluate(`document.querySelector('[aria-label="Options"]').setAttribute('data-seen', 'on the Options')`)
  await page.getByRole('button', { name: 'CREDITS' }).click()
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible()
  // The very screen that was the Options' top one is now the credits': it was not taken away and drawn again.
  await expect(page.getByRole('region', { name: 'Credits', exact: true }).first()).toHaveAttribute('data-seen', 'on the Options')
  await expect(page.getByRole('region', { name: 'Credits', exact: true }).last()).not.toHaveAttribute('data-seen')

  // Back: the same again, and the two screens come to rest.
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Options', exact: true }).first()).toHaveAttribute('data-seen', 'on the Options')
  await settled(page)
})

test('with reduced motion a screen is replaced at once: nothing is on its way out or in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/options')
  await page.getByRole('button', { name: 'CREDITS' }).click()
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible()
  expect(await page.evaluate<number>("document.querySelectorAll('.dn-dual__layer[inert], .dn-dual__layer[data-moving]').length")).toBe(0)
  expect(await page.evaluate<number>("document.querySelectorAll('.dn-dual__layer').length")).toBe(2)
})
