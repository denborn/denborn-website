import { expect, test } from '@playwright/test'
import { openHome } from './home.ts'

test('the credits open from the Options, thank those whose work the app stands on, and lead back', async ({ page }) => {
  await openHome(page)
  await page.getByRole('button', { name: /OPTIONS/ }).click()
  await page.getByRole('button', { name: 'CREDITS' }).click()
  await expect(page.getByRole('heading', { name: 'Credits', level: 2 })).toBeVisible()
  // Their page is a link out of the app, opened beside it.
  const showdown = page.getByRole('link', { name: 'Pokémon Showdown' })
  await expect(showdown).toHaveAttribute('href', 'https://github.com/smogon/pokemon-showdown')
  await expect(showdown).toHaveAttribute('target', '_blank')
  await expect(page.getByText('The Pokémon Showdown team')).toBeVisible()
  await expect(page.getByRole('link', { name: 'MissingNo. GIF' })).toHaveAttribute('href', 'https://www.deviantart.com/pokemon-ranger-sumi/art/MissingNo-GIF-667189987')
  // Back leads to the Options, where they were opened from.
  await page.getByRole('button', { name: 'BACK' }).click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
})
