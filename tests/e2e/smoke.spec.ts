import { expect, test } from '@playwright/test'

// The first visit downloads the whole app for offline use: sprites, game data and the battle engine.
// On a real network that takes a while, so "Ready" is waited for patiently.
const CACHED = { timeout: 120_000 }

test('the app caches itself and reloads with no network', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()

  // "Ready" is only shown once the service worker has stored the whole precache.
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible(CACHED)

  await context.setOffline(true)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()
  // A page other than the first is served offline too, with the game data and a sprite.
  await page.goto('/options')
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  await expect(page.getByText(/^\d+ Pokémon, \d+ moves \(/)).toBeVisible()
  const sprite = await page.evaluate(async () => (await fetch('/sprites/gen5ani/pikachu.gif')).status)
  expect(sprite).toBe(200)
})

test('the battle engine is fetched on demand and runs with no network once cached', async ({ page, context }) => {
  const engineRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/assets/self-check-')) engineRequests.push(request.url())
  })

  await page.goto('/options')
  await expect(page.getByText('Ready', { exact: true })).toBeVisible(CACHED)
  // The page itself never asks for the engine: only the offline cache has fetched it, in the background.
  expect(engineRequests).toEqual([])

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Check the engine' }).click()
  await expect(page.getByText(/^Working \(\d+ rounds in \d+ ms\)$/)).toBeVisible()
})

test('a frame makes the round trip through the Worker and Durable Object', async ({ page }) => {
  await page.goto('/options')
  await page.getByRole('button', { name: 'Check the relay' }).click()
  await expect(page.getByText(/^Reachable \(\d+ ms\)$/)).toBeVisible()
})

test('the language switch changes the interface and is remembered', async ({ page }) => {
  await page.goto('/options')
  await page.getByRole('radio', { name: 'Français' }).click()
  await expect(page.getByRole('heading', { name: 'Vérification du système' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Vérification du système' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})
