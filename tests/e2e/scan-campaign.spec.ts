import { expect, test } from '@playwright/test'
import { expectStep } from './creating.ts'

test('a campaign’s QR code held to the camera brings the campaign, and a character can be made for it', async ({ page }) => {
  // Without a reader of the browser's own, the app must use the one it carries: the same on every system the tests run on.
  await page.addInitScript({ content: `Object.defineProperty(window, 'BarcodeDetector', { value: undefined })` })
  await page.goto('/characters/new')
  await expectStep(page, 'Campaign')
  const create = page.getByRole('button', { name: 'CREATE', exact: true })
  await expect(page.getByRole('option', { name: 'New campaign', selected: true })).toBeVisible()

  // The camera is what comes over the bottom screen; once the code is read it goes, and the campaign is on the wheel.
  await page.getByRole('button', { name: 'Scan a QR code' }).click()
  await expect(page.getByRole('dialog', { name: 'Scan a QR code' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Night Shift', selected: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()

  await create.click()
  await expectStep(page, 'Pokémon')
  await expect(page).toHaveURL(/\/characters\/new\/e2eCampaign00001$/)
  // Kept on the device: it is offered again after a reload.
  await page.goto('/characters/new')
  await expect(page.getByRole('option', { name: 'Night Shift', selected: true })).toBeVisible()
})
