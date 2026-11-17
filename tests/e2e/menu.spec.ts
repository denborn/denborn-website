import { type Locator, type Page, expect, test } from '@playwright/test'
import { settled } from './accessible.ts'
import { openHome } from './home.ts'

/** The home's buttons, in the order they are read: two to a row. */
const BUTTONS = ['CHARACTERS', 'CAMPAIGNS', 'ACCOUNT', 'JOIN', 'OPTIONS', 'UPDATE']

/** Where a thing is in the window. */
async function boxOf(thing: Locator) {
  const box = await thing.boundingBox()
  if (!box) throw new Error('A thing of the home’s menu is not drawn.')
  return box
}

test('the home’s menu is six buttons two to a row, whole inside the bottom screen, over an empty row and the notice', async ({ page }) => {
  await openHome(page)
  await settled(page)
  const screen = await boxOf(page.getByRole('region', { name: 'Denborn' }).last())
  const boxes = []
  for (const name of BUTTONS) boxes.push(await boxOf(page.getByRole('button', { name, exact: true })))
  const [first, second, third] = boxes
  if (!first || !second || !third) throw new Error('The home’s menu has no buttons.')
  // From one row down to the next.
  const pitch = third.y - first.y

  boxes.forEach((box, index) => {
    const row = Math.floor(index / 2)
    const column = index % 2
    // Two columns and three rows, every button the size of the first: a finger's width high at the least.
    expect(box.x, BUTTONS[index]).toBeCloseTo(column === 0 ? first.x : second.x, 0)
    expect(box.y, BUTTONS[index]).toBeCloseTo(first.y + row * pitch, 0)
    expect(box.width, BUTTONS[index]).toBeCloseTo(first.width, 0)
    expect(box.height, BUTTONS[index]).toBeCloseTo(first.height, 0)
    expect(box.height, BUTTONS[index]).toBeGreaterThanOrEqual(44)
    // Whole inside the bottom screen.
    expect(box.x, BUTTONS[index]).toBeGreaterThanOrEqual(screen.x)
    expect(box.x + box.width, BUTTONS[index]).toBeLessThanOrEqual(screen.x + screen.width)
    expect(box.y, BUTTONS[index]).toBeGreaterThanOrEqual(screen.y)
  })
  expect(second.x).toBeGreaterThan(first.x + first.width)
  expect(pitch).toBeGreaterThan(first.height)

  // Under the third row a fourth is kept empty, then the notice, still inside the screen.
  const last = boxes.at(-1) ?? first
  const notice = await boxOf(page.getByText('Unofficial, non-commercial fan project.', { exact: false }))
  expect(notice.y).toBeGreaterThanOrEqual(last.y + 2 * last.height)
  expect(notice.y + notice.height).toBeLessThanOrEqual(screen.y + screen.height)
})

test('UPDATE cannot be pressed while no new version waits, and ACCOUNT opens its screen, which leads back', async ({ page }) => {
  await openHome(page)
  await expect(page.getByRole('button', { name: 'UPDATE', exact: true })).toBeDisabled()

  await page.getByRole('button', { name: 'ACCOUNT', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
  await expect(page.getByText('Not built yet.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('button', { name: 'ACCOUNT', exact: true })).toBeVisible()
})

/** How large the icon sheet is drawn behind one of its icons. */
async function sheetSize(icon: Locator): Promise<string> {
  const size = /background-size:\s*([^;]+)/.exec((await icon.getAttribute('style')) ?? '')?.[1]
  if (!size) throw new Error('An icon of the home’s menu has no sheet behind it.')
  return size
}

test('UPDATE’s Unown is the last letter of its word, as large as the other buttons’ Pokémon (decision 233)', async ({ page }) => {
  await openHome(page)
  await settled(page)
  const update = page.getByRole('button', { name: 'UPDATE', exact: true })
  const button = await boxOf(update)
  const word = await boxOf(update.locator('.dn-menu-button__label'))
  const unown = await boxOf(update.locator('.dn-icon'))

  // The word is in the middle of its button, and Unown ends it.
  expect(word.x + word.width / 2).toBeCloseTo(button.x + button.width / 2, 0)
  expect(unown.x + unown.width).toBeCloseTo(word.x + word.width, 0)
  // Drawn at the same size as JOIN's Pokémon: both are cut from one sheet, so the sheet is drawn as large behind both.
  const join = page.getByRole('button', { name: 'JOIN', exact: true })
  expect(await sheetSize(update.locator('.dn-icon'))).toBe(await sheetSize(join.locator('.dn-icon')))
  // Taller than the letters, Unown does not push its word down: the word stands as high in its button as JOIN's does.
  const joinButton = await boxOf(join)
  const joinWord = await boxOf(join.locator('.dn-menu-button__label'))
  expect(word.y - button.y).toBeCloseTo(joinWord.y - joinButton.y, 0)
  expect(word.height).toBeCloseTo(joinWord.height, 0)
  // Centred on the capitals (decision 237): its middle is the word's, within half of one of the screen's 256 DS pixels.
  const screen = await boxOf(page.getByRole('region', { name: 'Denborn' }).last())
  expect(Math.abs(unown.y + unown.height / 2 - (word.y + word.height / 2))).toBeLessThanOrEqual(screen.width / 256 / 2)
})

test('a button held down sinks, and comes back up when it is let go', async ({ page }) => {
  await openHome(page)
  await settled(page)
  const button = page.getByRole('button', { name: 'CAMPAIGNS', exact: true })
  const rest = await boxOf(button)
  await page.mouse.move(rest.x + rest.width / 2, rest.y + rest.height / 2)
  await page.mouse.down()
  await expect.poll(async () => (await boxOf(button)).y).toBeGreaterThan(rest.y + 1)

  // Let go beside it, so that nothing is opened: the button is back where it was.
  await page.mouse.move(rest.x + rest.width / 2, rest.y - 20)
  await page.mouse.up()
  await expect.poll(async () => (await boxOf(button)).y).toBeCloseTo(rest.y, 0)
  await expect(button).toBeVisible()
})

/** How wide JOIN's Pokémon is, and how far it is from its button's left edge, as parts of the button's width. */
async function pokemonOfJoin(page: Page): Promise<{ width: number; left: number }> {
  const button = page.getByRole('button', { name: 'JOIN', exact: true })
  const whole = await boxOf(button)
  const pokemon = await boxOf(button.locator('.dn-icon'))
  return { width: pokemon.width / whole.width, left: (pokemon.x - whole.x) / whole.width }
}

test('a button’s Pokémon is as large, and at the same place, on a desktop’s screen as on a phone’s (decision 232)', async ({ page, browser, baseURL }) => {
  await openHome(page)
  await settled(page)
  const onPhone = await pokemonOfJoin(page)

  // A desktop's window: the two screens at their widest, one device pixel per CSS pixel. Held to whole device pixels, a
  // drawing was a third larger there than on a phone.
  const context = await browser.newContext({ ...(baseURL ? { baseURL } : {}), viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'en-US' })
  const desktop = await context.newPage()
  await openHome(desktop)
  await settled(desktop)
  const onDesktop = await pokemonOfJoin(desktop)
  await context.close()

  expect(onDesktop.width).toBeCloseTo(onPhone.width, 2)
  expect(onDesktop.left).toBeCloseTo(onPhone.left, 2)
})
