import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openFile } from '../../src/storage/files.ts'
import { code, createPikachu } from './creating.ts'

test('a kept character opens as its sheet, which gives its file and its QR code', async ({ page }) => {
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await page.getByRole('button', { name: /Volt/ }).click()

  await expect(page.getByRole('heading', { name: 'Volt' })).toBeVisible()
  const part = page.getByRole('tabpanel')
  await expect(part).toContainText('Night Shift')
  await page.getByRole('tab', { name: 'MOVES' }).click()
  await expect(part).toContainText('Thunder Shock')

  await page.getByRole('tab', { name: 'SHARE' }).click()
  await expect(page.getByRole('img', { name: 'Volt' })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE ITS FILE' }).click()
  const opened = openFile(readFileSync(await (await downloading).path(), 'utf8'))
  expect(opened).toMatchObject({ kind: 'character', read: { ok: true, value: { nickname: 'Volt', species: 'pikachu', rules: { version: 3 } } } })

  // The sheet has its own address: it opens again from it, from what the device keeps.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Volt' })).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
})

test('the sheet prints as a page of its own, in place of the screens', async ({ page }) => {
  // The browser's print window cannot be driven: the test only notes that it was asked for.
  await page.addInitScript({ content: `window.print = () => { document.documentElement.dataset.printAsked = 'yes' }` })
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await page.getByRole('button', { name: /Volt/ }).click()

  const paper = page.locator('.dn-paper')
  await expect(page.getByRole('tablist')).toBeVisible()
  await expect(paper).toBeHidden()
  await page.getByRole('tab', { name: 'SHARE' }).click()
  await page.getByRole('button', { name: 'PRINT ITS SHEET' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-print-asked', 'yes')

  // What the printer gets: the paper sheet with the character on it, and none of the screens.
  await page.emulateMedia({ media: 'print' })
  await expect(paper).toBeVisible()
  await expect(page.getByRole('tablist')).toBeHidden()
  await expect(paper.getByRole('heading', { name: 'Volt' })).toBeVisible()
  await expect(paper).toContainText('Thunder Shock')
  await expect(paper.getByRole('img', { name: 'Volt' })).toBeVisible()
})

test('a character changed in the browser’s storage past its rules gets no sheet, and still gives its file', async ({ page }) => {
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  // Far more IV points than level 5 allows, written straight into what the browser keeps.
  await page.evaluate(() => {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith('denborn/character/')) continue
      const character = JSON.parse(localStorage.getItem(key) ?? '{}') as { ivs: Record<string, number> }
      for (const stat of Object.keys(character.ivs)) character.ivs[stat] = 31
      localStorage.setItem(key, JSON.stringify(character))
    }
  })
  await page.reload()
  await page.getByRole('button', { name: /Volt/ }).click()

  await expect(page.getByText('This character does not follow its campaign’s rules')).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE ITS FILE' }).click()
  const saved = JSON.parse(readFileSync(await (await downloading).path(), 'utf8')) as { nickname: string; ivs: { hp: number } }
  expect(saved).toMatchObject({ nickname: 'Volt', ivs: { hp: 31 } })
})

test('a character is removed only once the question is answered, with its file offered first', async ({ page }) => {
  const askToRemove = async (): Promise<void> => {
    await page.getByRole('tab', { name: 'SHARE' }).click()
    await page.getByRole('button', { name: 'REMOVE FROM THIS DEVICE' }).click()
    await expect(page.getByRole('heading', { name: 'Remove Volt?' })).toBeVisible()
  }
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await page.getByRole('button', { name: /Volt/ }).click()

  // Keeping it changes nothing.
  await askToRemove()
  await page.getByRole('button', { name: 'KEEP IT' }).click()
  await expect(page.getByRole('heading', { name: 'Volt', exact: true })).toBeVisible()

  await askToRemove()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE ITS FILE' }).click()
  expect(openFile(readFileSync(await (await downloading).path(), 'utf8'))).toMatchObject({ kind: 'character', read: { ok: true, value: { nickname: 'Volt' } } })
  await page.getByRole('button', { name: 'REMOVE', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Volt/ })).toHaveCount(0)
  // Gone from what the browser keeps, not only from the screen.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Volt/ })).toHaveCount(0)
})

test('the address of a character this device does not keep says so', async ({ page }) => {
  await page.goto('/characters/nobodyAtAll00000')
  await expect(page.getByText('This character is not on this device.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'SAVE ITS FILE' })).toHaveCount(0)
})
