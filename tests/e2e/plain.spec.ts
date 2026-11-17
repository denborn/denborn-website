import { type Locator, type Page, expect, test } from '@playwright/test'
import { keep } from './characters.ts'
import { pikachu } from './creating.ts'
import { openHome } from './home.ts'

/** The top screen of the list of characters. */
const plain = (page: Page): Locator => page.getByRole('region', { name: 'Characters', exact: true }).first()

// Who is on the plain is decoration, hidden from assistive technology (the list below names every character): it has no role
// to be asked by, so it is found by what it is in the page.
const walker = (page: Page, name: string): Locator => plain(page).locator('.dn-wanderer', { hasText: name })
const ghost = (page: Page, name: string): Locator => plain(page).locator('.dn-ghost', { hasText: name })

/** Whether the name is whole inside the top screen. */
async function shows(page: Page, name: Locator): Promise<boolean> {
  const screen = await plain(page).boundingBox()
  const box = await name.boundingBox()
  if (!screen || !box) return false
  return box.x >= screen.x && box.y >= screen.y && box.x + box.width <= screen.x + screen.width && box.y + box.height <= screen.y + screen.height
}

/** How many animations are running on the page. Asked in the page's own words: the tests know no browser types. */
function running(page: Page): Promise<number> {
  return page.evaluate<number>("document.getAnimations().filter((animation) => animation.playState === 'running').length")
}

test('from the home to the list of characters the den carries on, and the character walks in under its name', async ({ page }) => {
  await keep(page, pikachu('Volt', 'e2eCharacter0001'))
  await openHome(page)
  // The home's top screen is marked, to be known again.
  await expect(page.getByRole('region', { name: 'Denborn', exact: true })).toHaveCount(2)
  await page.evaluate(`document.querySelector('[aria-label="Denborn"]').setAttribute('data-seen', 'on the home')`)
  await page.getByRole('button', { name: /CHARACTERS/ }).click()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()

  // The very screen that was the home's: the den was not taken away and drawn again, its rain goes on.
  await expect(plain(page)).toHaveAttribute('data-seen', 'on the home')
  // The character comes in from out of sight, under its name; the list below is still the one way to it.
  await expect(walker(page, 'Volt')).toHaveCount(1)
  await expect.poll(() => shows(page, walker(page, 'Volt').locator('.dn-denizen__name'))).toBe(true)
  await expect(page.getByRole('button', { name: /Volt/ })).toHaveCount(1)

  // Back on the home it walks off: it is not taken away at once, and then it is gone.
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('button', { name: /CHARACTERS/ })).toBeVisible()
  await expect(page.locator('.dn-wanderer')).toHaveCount(0, { timeout: 15_000 })
})

test('with reduced motion the character stands by the den at once, its sprite held still, and nothing runs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await keep(page, pikachu('Volt', 'e2eCharacter0001'))
  await page.goto('/characters')
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()

  await expect.poll(() => shows(page, walker(page, 'Volt').locator('.dn-denizen__name'))).toBe(true)
  // It was put there, not walked there, and its sprite is the one frame drawn in the animated picture's place.
  await expect(walker(page, 'Volt')).toHaveCSS('transition-property', 'none')
  await expect(walker(page, 'Volt').locator('canvas').first()).toBeVisible()
  await expect.poll(() => running(page)).toBe(0)
})

test('a dead character does not walk: it rises in the den’s light, under its name', async ({ page }) => {
  await keep(page, pikachu('Volt', 'e2eCharacter0001'), { ...pikachu('Osselet', 'e2eCharacter0002'), hp: 0, condition: { state: 'dead' } })
  await page.goto('/characters')
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()

  await expect(walker(page, 'Volt')).toHaveCount(1)
  await expect(ghost(page, 'Osselet')).toHaveCount(1, { timeout: 10_000 })
  await expect(walker(page, 'Osselet')).toHaveCount(0)
  // Both are listed below, the dead one too.
  await expect(page.getByRole('button', { name: /Volt/ })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Osselet/ })).toHaveCount(1)
})
