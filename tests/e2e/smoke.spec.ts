import { expect, test } from '@playwright/test'

test('the app caches itself and reloads with no network', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()

  // "Ready" is only shown once the service worker has stored the whole precache.
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
})

test('a frame makes the round trip through the Worker and Durable Object', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(/^Reachable \(\d+ ms\)$/)).toBeVisible()
})

test('the language switch changes the interface and is remembered', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Français' }).check()
  await expect(page.getByRole('heading', { name: 'Vérification du système' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Vérification du système' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})
