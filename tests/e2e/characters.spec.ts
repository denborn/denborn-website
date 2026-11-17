import { type Page, expect, test } from '@playwright/test'
import { keep, strip } from './characters.ts'
import { pikachu } from './creating.ts'

/** The characters in the strip, in its order: the order the arrows go round them in. */
async function inOrder(page: Page): Promise<string[]> {
  return (await strip(page).getByRole('button').allTextContents()).map((name) => name.trim())
}

/** Whether the one of that name is the one shown: its icon in the strip is the pressed one. */
async function expectShown(page: Page, name: string | undefined): Promise<void> {
  if (name === undefined) throw new Error('No such character in the strip.')
  await expect(strip(page).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(strip(page).locator('[aria-pressed="true"]')).toHaveCount(1)
}

test('the arrows go round the characters, the strip picks one, and SHEET opens the one shown', async ({ page }) => {
  const ids: Record<string, string> = { Volt: 'e2eCharacter0001', Zap: 'e2eCharacter0002', Pile: 'e2eCharacter0003' }
  await keep(page, ...Object.entries(ids).map(([name, id]) => pikachu(name, id)))
  await page.goto('/characters')
  await expect(strip(page).getByRole('button')).toHaveCount(3)
  const [first, second, last] = await inOrder(page)

  // The first is shown at first; the arrows go on and back, and round from the first to the last.
  await expectShown(page, first)
  await page.getByRole('button', { name: 'Next character' }).click()
  await expectShown(page, second)
  await page.getByRole('button', { name: 'Previous character' }).click()
  await page.getByRole('button', { name: 'Previous character' }).click()
  await expectShown(page, last)
  await page.getByRole('button', { name: 'Next character' }).click()
  await expectShown(page, first)

  // The strip shows one directly; SHEET opens that one's sheet, and back on the list it is still the one shown. (These characters
  // carry no rules of their campaign: their sheet's page says so, which is enough here.)
  await strip(page).getByRole('button', { name: second, exact: true }).click()
  await expectShown(page, second)
  await page.getByRole('button', { name: 'SHEET' }).click()
  await expect(page).toHaveURL(new RegExp(`/characters/${ids[second ?? ''] ?? 'none'}$`))
  await page.getByRole('button', { name: 'BACK' }).click()
  await expectShown(page, second)
})

test('with one character there are no arrows, and with none there is nothing to show but how to make one', async ({ page }) => {
  await keep(page, pikachu('Volt', 'e2eCharacter0001'))
  await page.goto('/characters')
  await expectShown(page, 'Volt')
  await expect(page.getByRole('button', { name: 'Next character' })).toHaveCount(0)

  await page.evaluate(() => localStorage.removeItem('denborn/character/e2eCharacter0001'))
  await page.reload()
  await expect(page.getByText('No character on this device yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'SHEET' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'NEW' })).toBeVisible()
})

test('the one shown slides under the mouse: let go too near it springs back, far enough the next one comes', async ({ page }) => {
  await keep(page, pikachu('Volt', 'e2eCharacter0001'), pikachu('Zap', 'e2eCharacter0002'))
  await page.goto('/characters')
  await expect(strip(page).getByRole('button')).toHaveCount(2)
  const [first, second] = await inOrder(page)
  await expectShown(page, first)

  // The stage the one shown stands on has no role of its own: it is found by what it is in the page.
  const stage = await page.locator('.dn-showcase__stage').boundingBox()
  if (!stage) throw new Error('No stage on the screen.')
  const middle = { x: stage.x + stage.width / 2, y: stage.y + stage.height / 2 }
  const slide = async (by: number): Promise<void> => {
    await page.mouse.move(middle.x, middle.y)
    await page.mouse.down()
    await page.mouse.move(middle.x + by, middle.y, { steps: 6 })
    await page.mouse.up()
  }

  await slide(-12)
  await expectShown(page, first)
  await slide(-stage.width / 2)
  await expectShown(page, second)
  await slide(stage.width / 2)
  await expectShown(page, first)
})
