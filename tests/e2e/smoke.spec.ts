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

test('the battle engine is fetched on demand and runs with no network once cached', async ({ page, context }) => {
  const engineRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/assets/self-check-')) engineRequests.push(request.url())
  })

  await page.goto('/')
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  // The page itself never asks for the engine: only the offline cache has fetched it, in the background.
  expect(engineRequests).toEqual([])

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Check the engine' }).click()
  await expect(page.getByText(/^Working \(\d+ rounds in \d+ ms\)$/)).toBeVisible()
})

test('a frame makes the round trip through the Worker and Durable Object', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Check the relay' }).click()
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
