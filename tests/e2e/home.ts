/** What the browser tests share to reach the home's menu: every start of the app opens on the title screen (decision 205). */
import type { Page } from '@playwright/test'

/** Opens the app as a new start does, and passes the title screen with its one tap: the home's menu is there. */
export async function openHome(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'TOUCH TO START' }).click()
}
