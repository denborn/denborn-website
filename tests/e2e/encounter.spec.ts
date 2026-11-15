import { expect, test } from '@playwright/test'
import { draftEncounter, setCampaign } from './creating.ts'

test('an encounter prepared from its campaign’s page is kept with the campaign, and leaving before it is saved asks first', async ({ page }) => {
  const done = page.getByRole('button', { name: 'DONE' })
  const back = page.getByRole('button', { name: 'BACK' })
  const save = page.getByRole('button', { name: 'SAVE THE ENCOUNTER' })
  await setCampaign(page, 'Dawn Patrol')
  await expect(page.getByText('No encounter is prepared yet.')).toBeVisible()
  await page.getByRole('button', { name: 'ENCOUNTERS' }).click()
  await page.getByRole('button', { name: 'NEW', exact: true }).click()
  await expect(save).toBeDisabled()

  await draftEncounter(page, 'The quarry')
  await page.getByRole('button', { name: /^Class/ }).click()
  await page.getByRole('button', { name: /^BOSS/ }).click()
  // What is open is in the address: the browser's Back closes it like DONE does.
  await page.goBack()
  await expect(page.getByRole('button', { name: /^Class/ })).toContainText('BOSS')
  await done.click()
  // An enemy starts at the level characters start at (decision 142).
  await expect(page.getByText('Pikachu · Lv. 5 · BOSS')).toBeVisible()

  await back.click()
  await expect(page.getByRole('alert')).toContainText('Leave without saving them?')
  await page.getByRole('button', { name: 'STAY' }).click()
  await save.click()
  // A saved encounter has an address of its own.
  await expect(page).toHaveURL(/\/encounters\/[A-Za-z0-9_-]{16}$/)

  // Every part opened on the way was closed behind it: one Back leaves the encounter.
  await page.goBack()
  await expect(page.getByRole('button', { name: /^The quarry/ })).toContainText('1 enemy · Lv. 5')
  await page.reload()
  await back.click()
  await expect(page.getByText('1 encounter is prepared.')).toBeVisible()

  // Kept as it was made, and removed once the question is answered.
  await page.getByRole('button', { name: 'ENCOUNTERS' }).click()
  await page.getByRole('button', { name: /^The quarry/ }).click()
  await expect(page.getByText('Pikachu · Lv. 5 · BOSS')).toBeVisible()
  await page.getByRole('button', { name: 'REMOVE THIS ENCOUNTER' }).click()
  await page.getByRole('button', { name: 'REMOVE', exact: true }).click()
  await expect(page.getByText('No encounter is prepared yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^The quarry/ })).toBeHidden()
})
