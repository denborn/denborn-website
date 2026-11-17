import { type Page, expect, test } from '@playwright/test'
import { openHome } from './home.ts'

const start = (page: Page) => page.getByRole('button', { name: 'TOUCH TO START' })
const firstWayIn = (page: Page) => page.getByRole('button', { name: /CHARACTERS/ })

/** How many animations are running on the page: the rain, the light, the blink of TOUCH TO START. Asked in the page's own words: the tests know no browser types. */
function running(page: Page): Promise<number> {
  return page.evaluate<number>("document.getAnimations().filter((animation) => animation.playState === 'running').length")
}

test('each start of the app opens on the title screen, and one tap during its intro gives the menu at once', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()
  await expect(start(page)).toBeVisible()
  await expect(firstWayIn(page)).toBeHidden()

  // The intro has only begun: the tap does not wait for it.
  await start(page).click()
  await expect(start(page)).toBeHidden()
  // A keyboard goes on from the first thing in the menu.
  await expect(firstWayIn(page)).toBeFocused()

  // The title shows once in a visit: coming back to the home shows the menu.
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(firstWayIn(page)).toBeVisible()
  await expect(start(page)).toBeHidden()

  // A new start shows it again.
  await page.reload()
  await expect(start(page)).toBeVisible()
})

test('a tap on the top screen passes the title too, and the keyboard passes it with the button', async ({ page }) => {
  await page.goto('/')
  // Both screens of the home are there: the first of them is the top one.
  const screens = page.getByRole('region', { name: 'Denborn' })
  await expect(screens).toHaveCount(2)
  await screens.first().click()
  await expect(firstWayIn(page)).toBeVisible()

  await page.reload()
  await start(page).focus()
  await page.keyboard.press('Enter')
  // The key that passed the title does not go on into the menu and open its first entry.
  await expect(firstWayIn(page)).toBeFocused()
  await expect(page).toHaveURL(/\/$/)
})

test('a visit that opens on a link or on another page never shows the title', async ({ page }) => {
  await page.goto('/#DNJ1.NOTACODE')
  await expect(page.getByRole('textbox', { name: 'Join code' })).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(firstWayIn(page)).toBeVisible()
  await expect(start(page)).toBeHidden()

  await page.goto('/options')
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(firstWayIn(page)).toBeVisible()
  await expect(start(page)).toBeHidden()
})

/** The den's name on the scene, whether a screen reader has it or not: one that goes is still drawn as it fades. */
const drawnNames = (page: Page): Promise<number> => page.evaluate<number>("document.querySelectorAll('.dn-title').length")

/** How much of the den's name shows: its own opacity times that of every box it is in. */
const nameShows = (page: Page): Promise<number> =>
  page.evaluate<number>(
    "(() => { let shows = 1; for (let box = document.querySelector('.dn-title'); box; box = box.parentElement) shows *= Number(getComputedStyle(box).opacity); return shows })()",
  )

test('from the home to the Options and back the den stays, and its name fades out, then in again', async ({ page }) => {
  await openHome(page)
  const name = page.getByRole('heading', { name: 'Denborn', level: 1 })
  await expect(name).toBeVisible()
  // The scene is marked, to be known again. Asked in the page's own words: the tests know no browser types.
  await page.evaluate(`document.querySelector('.dn-title-scene').setAttribute('data-seen', 'on the home')`)

  // The name that goes is out of reach at once, but still drawn as it fades; then it is gone. The den is the one the home showed.
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await expect(name).toHaveCount(0)
  expect(await drawnNames(page)).toBe(1)
  await expect.poll(() => drawnNames(page)).toBe(0)
  await expect(page.locator('.dn-title-scene')).toHaveAttribute('data-seen', 'on the home')

  // Back: it fades in on the same den, and ends whole.
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(name).toHaveCount(1)
  expect(await nameShows(page)).toBeLessThan(1)
  await expect.poll(() => nameShows(page)).toBe(1)
  await expect(page.locator('.dn-title-scene')).toHaveAttribute('data-seen', 'on the home')
})

test('with reduced motion the den’s name goes and comes back at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openHome(page)
  const name = page.getByRole('heading', { name: 'Denborn', level: 1 })
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await expect(name).toHaveCount(0)
  // Gone well before a fade (0.28 s) could have ended.
  await expect.poll(() => drawnNames(page), { intervals: [10], timeout: 150 }).toBe(0)
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(name).toHaveCount(1)
  expect(await nameShows(page)).toBe(1)
})

test('with reduced motion the title opens on its storm standing still, and still waits for its tap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  // No intro to wait for: the name and the words are there at once, and nothing moves.
  await expect(page.getByText('TOUCH TO START')).toHaveCSS('opacity', '1')
  await expect.poll(() => running(page)).toBe(0)
  await start(page).click()
  await expect(firstWayIn(page)).toBeVisible()
})

test('the Options’ switch holds the title screen still, and the device remembers it', async ({ page }) => {
  await openHome(page)
  await expect.poll(() => running(page)).toBeGreaterThan(0)

  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('radio', { name: 'OFF' }).click()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(firstWayIn(page)).toBeVisible()
  await expect.poll(() => running(page)).toBe(0)

  // A new start: the title waits for its tap, standing still.
  await page.reload()
  await expect(page.getByText('TOUCH TO START')).toHaveCSS('opacity', '1')
  await expect.poll(() => running(page)).toBe(0)
  await start(page).click()
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await expect(page.getByRole('radio', { name: 'OFF' })).toBeChecked()
})
