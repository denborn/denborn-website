/** What the browser tests of a fight share: reading the message band, and the game master's own part of the touch screen. */
import { type Page, expect } from '@playwright/test'

/** The battle's message band says this, once it has typed it out whole. */
export async function said(page: Page, text: string, timeout?: number): Promise<void> {
  await expect(page.locator('.dn-message > [aria-hidden="true"]').first()).toHaveText(text, timeout === undefined ? {} : { timeout })
}

/** The game master opens TOOLS from the commands: the encounter as it stands, under its name and round. */
export async function openTools(gm: Page, heading: string): Promise<void> {
  await gm.getByRole('button', { name: /^TOOLS/ }).click()
  await expect(gm.getByRole('heading', { name: heading })).toBeVisible()
}
