import { expect, test } from '@playwright/test'
import { createPikachu, setCampaign } from './creating.ts'

test('a campaign set by its game master gives a creation link that makes a character', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await setCampaign(page, 'Dawn Patrol')
  await page.getByRole('button', { name: 'COPY THE LINK' }).click()
  await expect(page.getByText('Copied.')).toBeVisible()
  const link = await page.evaluate<string>('navigator.clipboard.readText()')

  // The link opens creation for that campaign: its name, its starting level, its item pack.
  await page.goto(link)
  await createPikachu(page, 'Volt', 'Field kit')
  await expect(page.getByText('Lv. 5', { exact: true })).toBeVisible()
  await expect(page.getByText('Dawn Patrol', { exact: true })).toBeVisible()
})

test('a changed rule makes the next version once saved, and leaving before that asks first', async ({ page }) => {
  await setCampaign(page, 'Dawn Patrol')
  await page.getByRole('button', { name: /^Starting level/ }).click()
  await page.getByRole('spinbutton', { name: 'Starting level' }).fill('30')
  await page.getByRole('button', { name: 'DONE' }).click()
  // The link is of the rules as saved: it gives way while they differ.
  await expect(page.getByText('Changes not saved yet.')).toBeVisible()
  await expect(page.getByText('Creation link · Rules version 1')).toHaveCount(0)

  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('alert')).toContainText('Leave without saving them?')
  await page.getByRole('button', { name: 'STAY' }).click()
  await page.getByRole('button', { name: 'SAVE THE RULES' }).click()
  await expect(page.getByText('Creation link · Rules version 2')).toBeVisible()

  // Kept by the browser, not only shown.
  await page.getByRole('button', { name: 'BACK' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /Dawn Patrol/ })).toContainText('Rules version 2 · 151 Pokémon')
})

test('filters, then one tap, make exactly the Pokémon shown the playable ones (decision 129)', async ({ page }) => {
  await page.goto('/campaigns/new')
  await page.getByRole('button', { name: /^Pokémon/ }).click()
  await expect(page.getByRole('status')).toHaveText('151 of 151 playable · 151 shown')

  // Setting filters changes what is shown, and nothing else.
  await page.getByRole('button', { name: 'FILTERS' }).click()
  await page.getByRole('group', { name: 'Legendary and Mythical' }).getByRole('button', { name: 'ONLY' }).click()
  await expect(page.getByRole('status')).toHaveText('151 of 151 playable · 5 shown')

  await page.getByRole('button', { name: 'KEEP ONLY THE SHOWN' }).click()
  await expect(page.getByRole('status')).toHaveText('5 of 151 playable · 5 shown')
  await expect(page.getByRole('button', { name: /^Mewtwo/ })).toHaveAttribute('aria-pressed', 'true')

  // With the filter gone, the others are shown again, and are not playable.
  await page.getByRole('group', { name: 'Legendary and Mythical' }).getByRole('button', { name: 'ANY' }).click()
  await expect(page.getByRole('status')).toHaveText('5 of 151 playable · 151 shown')
  await expect(page.getByRole('button', { name: /^Bulbasaur/ })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'DONE' }).click()
  await expect(page.getByRole('button', { name: /^Pokémon/ })).toContainText('5 of 151')
})

test('a campaign leaves as a file, is removed once the question is answered, and comes back in from the file', async ({ page }) => {
  await setCampaign(page, 'Dawn Patrol')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE ITS FILE' }).click()
  const file = await (await downloading).path()

  // Keeping it changes nothing.
  await page.getByRole('button', { name: 'REMOVE FROM THIS DEVICE' }).click()
  await expect(page.getByRole('heading', { name: 'Remove Dawn Patrol?' })).toBeVisible()
  await page.getByRole('button', { name: 'KEEP IT' }).click()
  await expect(page.getByText('Creation link · Rules version 1')).toBeVisible()

  await page.getByRole('button', { name: 'REMOVE FROM THIS DEVICE' }).click()
  await page.getByRole('button', { name: 'REMOVE', exact: true }).click()
  await expect(page.getByText('No campaign on this device yet.')).toBeVisible()

  // Shown first, kept only when asked.
  await page.getByRole('button', { name: 'IMPORT' }).click()
  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByText('Dawn Patrol can be added to this device.')).toBeVisible()
  await page.getByRole('button', { name: 'ADD IT' }).click()
  await expect(page.getByText('Creation link · Rules version 1')).toBeVisible()

  // The same file again leaves nothing to choose.
  await page.goto('/campaigns/import')
  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByText('Dawn Patrol is already on this device, exactly as it is here.')).toBeVisible()
})
