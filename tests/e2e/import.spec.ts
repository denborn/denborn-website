import { type Page, expect, test } from '@playwright/test'
import { encodeCharacterCode, qrForm } from '../../src/shared/codec/codes.ts'
import { code, createPikachu, invitation, pikachu } from './creating.ts'

/** The Pokédollars of the one character the browser keeps. */
async function moneyKept(page: Page): Promise<number | undefined> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('denborn/character/'))
    return key ? (JSON.parse(localStorage.getItem(key) ?? '{}') as { money?: number }).money : undefined
  })
}

test('a character saved as a file comes back in from that file', async ({ page }) => {
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await page.getByRole('button', { name: /Volt/ }).click()
  await page.getByRole('tab', { name: 'SHARE' }).click()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE ITS FILE' }).click()
  const file = await (await downloading).path()

  // The browser loses the character, as when its storage is cleared.
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('denborn/character/')) localStorage.removeItem(key)
  })
  await page.goto('/characters')
  await expect(page.getByRole('button', { name: /Volt/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'IMPORT' }).click()
  await page.locator('input[type=file]').setInputFiles(file)
  // Shown first, kept only when asked.
  await expect(page.getByText('Volt can be added to this device.')).toBeVisible()
  expect(await moneyKept(page)).toBeUndefined()
  await page.getByRole('button', { name: 'ADD IT' }).click()

  await expect(page.getByRole('heading', { name: 'Volt' })).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('button', { name: /Volt/ })).toBeVisible()
})

test('a character already here is shown beside the one coming in, and replaced only when asked', async ({ page }) => {
  const volt = pikachu('Volt', 'e2eCharacter0001')
  const voltCode = encodeCharacterCode(volt)
  const bringIn = async (): Promise<void> => {
    await page.goto('/characters/import')
    await page.getByRole('textbox', { name: 'Its link or code' }).fill(voltCode)
    await page.getByRole('button', { name: 'OPEN' }).click()
  }

  await page.goto(`/#${code}`)
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()
  // The device keeps a copy that went on playing: saved more times, and richer.
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [
    `denborn/character/${volt.id}`,
    JSON.stringify({ ...volt, rules: invitation.rules, revision: 2, money: volt.money + 250 }),
  ] as const)

  await bringIn()
  await expect(page.getByText('The copy kept here is more recent.')).toBeVisible()
  await page.getByRole('button', { name: 'KEEP THE ONE HERE' }).click()
  await expect(page.getByRole('heading', { name: 'Volt' })).toBeVisible()
  expect(await moneyKept(page)).toBe(volt.money + 250)

  await bringIn()
  await page.getByRole('button', { name: 'REPLACE' }).click()
  await expect(page.getByRole('heading', { name: 'Volt' })).toBeVisible()
  expect(await moneyKept(page)).toBe(volt.money)

  // Once the two are alike there is nothing left to choose.
  await bringIn()
  await expect(page.getByText('Volt is already on this device, exactly as it is here.')).toBeVisible()
})

test('a character’s link opens the import screen, and needs its campaign’s rules on the device', async ({ page }) => {
  const link = `/#${qrForm(encodeCharacterCode(pikachu('Volt', 'e2eCharacter0001')))}`
  await page.goto(link)
  // The code leaves the address once it is taken.
  await expect(page).toHaveURL(/\/characters\/import$/)
  await expect(page.getByText('The rules of its campaign are not on this device.')).toBeVisible()

  // Once the campaign's creation link was opened here, the same link shows the character.
  await page.goto(`/#${code}`)
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()
  await page.goto(link)
  await expect(page.getByText('Volt can be added to this device.')).toBeVisible()
})

test('a camera that is refused says so and leaves the other ways in', async ({ page }) => {
  await page.addInitScript({ content: `navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('refused', 'NotAllowedError'))` })
  await page.goto('/characters/import')
  await page.getByRole('button', { name: 'SCAN A QR CODE' }).click()
  await expect(page.getByRole('alert')).toContainText('The camera is not allowed for this app.')
  await expect(page.getByRole('button', { name: 'CHOOSE A FILE' })).toBeVisible()
})
