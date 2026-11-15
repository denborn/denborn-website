import { expect, test } from '@playwright/test'
import { SCANNED_NICKNAME } from './camera.ts'
import { code } from './creating.ts'

test('a QR code held to the camera is read by the reader the app carries, and its character can be added', async ({ page, baseURL }) => {
  // Without a reader of the browser's own, the app must use the one it carries: the same on every system the tests run on.
  await page.addInitScript({ content: `Object.defineProperty(window, 'BarcodeDetector', { value: undefined })` })
  const site = new URL(baseURL ?? '').host
  const fetchedElsewhere: string[] = []
  const engines: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.protocol.startsWith('http') && url.host !== site) fetchedElsewhere.push(request.url())
    if (url.pathname.endsWith('.wasm')) engines.push(url.host)
  })

  // A code carries no rules: the device must have opened the campaign first.
  await page.goto(`/#${code}`)
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()

  await page.goto('/characters/import')
  await page.getByRole('button', { name: 'SCAN A QR CODE' }).click()
  await expect(page.getByText(`${SCANNED_NICKNAME} can be added to this device.`)).toBeVisible()
  await page.getByRole('button', { name: 'ADD IT' }).click()
  await expect(page.getByRole('heading', { name: SCANNED_NICKNAME })).toBeVisible()

  // The reader's engine was loaded, and it came with the app, not from a CDN.
  expect(engines).toEqual([site])
  expect(fetchedElsewhere).toEqual([])
})
