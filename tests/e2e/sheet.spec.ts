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

test('the address of a character this device does not keep says so', async ({ page }) => {
  await page.goto('/characters/nobodyAtAll00000')
  await expect(page.getByText('This character is not on this device.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'SAVE ITS FILE' })).toHaveCount(0)
})
