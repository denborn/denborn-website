import { readFileSync } from 'node:fs'
import { type Page, expect, test } from '@playwright/test'
import type { DataPack } from '../../src/data/types.ts'
import { sampleRules } from '../../src/domain/samples.ts'
import { encodeCreationCode } from '../../src/shared/codec/codes.ts'
import { openFile } from '../../src/storage/files.ts'

// The game data the build made: the link below is written with it, as a game master's app would.
const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack
const invitation = { campaign: { id: 'e2eCampaign00001', name: 'Night Shift' }, dataPackVersion: pack.version, rules: { ...sampleRules(pack, 2, 2, 4), startingLevel: 5 } }
const code = encodeCreationCode(invitation, pack.species)

/** Goes through the seven steps with the fewest choices that make a character. */
async function createPikachu(page: Page, nickname: string): Promise<void> {
  const next = page.getByRole('button', { name: 'NEXT', exact: true })
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()
  await expect(next).toBeDisabled()
  await page.getByRole('searchbox').fill('pika')
  await page.getByRole('button', { name: /Pikachu/ }).click()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('textbox', { name: 'Nickname' }).fill(nickname)
  await page.getByRole('button', { name: /^Female/ }).click()
  await page.getByRole('button', { name: /^Jolly/ }).click()
  await page.getByRole('button', { name: /^Static/ }).click()
  await next.click()

  await expect(page.getByRole('heading', { name: 'Roleplay attributes' })).toBeVisible()
  await next.click()
  await expect(page.getByRole('heading', { name: 'IVs and EVs' })).toBeVisible()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: /^Thunder Shock/ }).click()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: /^Sac d’aventurier 1/ }).click()
  await next.click()

  await expect(page.getByRole('heading', { name: 'A last look' })).toBeVisible()
  await page.getByRole('button', { name: 'CREATE' }).click()
}

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
