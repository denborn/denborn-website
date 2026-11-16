import { expect, test } from '@playwright/test'

test('the credits open from the home screen and from the Options, thank those whose work the app stands on, and lead back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'CREDITS' }).click()
  await expect(page.getByRole('heading', { name: 'Credits', level: 2 })).toBeVisible()
  // Their page is a link out of the app, opened beside it.
  const showdown = page.getByRole('link', { name: 'Pokémon Showdown' })
  await expect(showdown).toHaveAttribute('href', 'https://github.com/smogon/pokemon-showdown')
  await expect(showdown).toHaveAttribute('target', '_blank')
  await expect(page.getByText('The Pokémon Showdown team')).toBeVisible()
  await expect(page.getByText('Pokemon-Ranger-Sumi')).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('heading', { name: 'Denborn', level: 1 })).toBeVisible()

  // From the Options, back leads to the Options.
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('button', { name: 'CREDITS' }).click()
  await expect(page.getByRole('heading', { name: 'Credits', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
})
