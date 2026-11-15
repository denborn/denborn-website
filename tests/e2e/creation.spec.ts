import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openFile } from '../../src/storage/files.ts'
import { code, createPikachu } from './creating.ts'

test('a creation link opens the campaign, and the character made is kept on the device', async ({ page, context }) => {
  await page.goto(`/#${code}`)
  // The code leaves the address once it is taken, so that a reload does not open it again.
  await expect(page).toHaveURL(/\/characters\/new\/e2eCampaign00001$/)
  await createPikachu(page, 'Volt')

  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  await expect(page.getByText('Volt', { exact: true })).toBeVisible()
  await expect(page.getByText('Pikachu · Lv. 5 · Night Shift')).toBeVisible()

  // Still there after a reload, and with no network: it is in the browser's storage, not in memory.
  await page.reload()
  await expect(page.getByText('Volt', { exact: true })).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'BACK' }).click()
  await page.getByRole('button', { name: /CHARACTERS/ }).click()
  await expect(page.getByText('Volt', { exact: true })).toBeVisible()
})

test('a campaign opened once is offered again, and a pasted link opens too', async ({ page }) => {
  await page.goto('/characters/new')
  await expect(page.getByText('None yet. Open a creation link below.')).toBeVisible()
  await page.getByRole('textbox', { name: 'Creation link' }).fill(`https://example.test/#${code}`)
  await page.getByRole('button', { name: 'OPEN' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()

  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('button', { name: /Night Shift/ })).toBeVisible()
})

test('a link that cannot be read says why, and opens nothing', async ({ page }) => {
  await page.goto(`/#${code.slice(0, -10)}`)
  await expect(page.getByText('This link is incomplete or was altered. Ask for it again.')).toBeVisible()
  await expect(page.getByText('None yet. Open a creation link below.')).toBeVisible()

  await page.getByRole('textbox', { name: 'Creation link' }).fill('hello')
  await page.getByRole('button', { name: 'OPEN' }).click()
  await expect(page.getByText('This is not a creation link.')).toBeVisible()
})

test('the page says so when the browser refuses to keep anything', async ({ page }) => {
  // A browser that refuses its storage, as in some private modes.
  await page.addInitScript({
    content: `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('refused', 'SecurityError') } })`,
  })
  await page.goto('/characters')
  await expect(page.getByRole('alert')).toContainText('This browser does not let the app keep anything.')
})

test('a character the device has no room for is offered as a file at once', async ({ page }) => {
  // The storage takes the campaign but has no room left when the character comes.
  await page.addInitScript({
    content: `const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('denborn/character/')) throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      }`,
  })
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await expect(page.getByRole('alert')).toContainText('There is no room left on this device to keep it.')

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE THE FILE' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('denborn-volt.json')
  // The file is the whole character with its rules: it opens as one.
  const opened = openFile(readFileSync(await download.path(), 'utf8'))
  expect(opened).toMatchObject({ kind: 'character', read: { ok: true, value: { nickname: 'Volt', level: 5, rules: { version: 3 } } } })
})
