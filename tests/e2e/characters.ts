import { type Page, expect } from '@playwright/test'
import type { CharacterDocument } from '../../src/shared/schema/character.ts'

/** Puts characters among those the browser keeps, as if they had been made or brought in on it. */
export async function keep(page: Page, ...characters: CharacterDocument[]): Promise<void> {
  await page.goto('/')
  await page.evaluate((kept) => {
    for (const [key, value] of kept) localStorage.setItem(key, value)
  }, characters.map((character) => [`denborn/character/${character.id}`, JSON.stringify(character)] as const))
}

/** The strip of the list of characters, where each is picked by its name (decision 241). */
export const strip = (page: Page) => page.getByRole('list', { name: 'All your characters' })

/** On the list of characters: shows the one of that name, picked in the strip, then opens its sheet. */
export async function openSheetOf(page: Page, name: string): Promise<void> {
  await strip(page).getByRole('button', { name, exact: true }).click()
  await expect(strip(page).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'SHEET' }).click()
}
