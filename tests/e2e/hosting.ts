/** What the browser tests of a session share: a game master hosting on one phone, a player with a character on another. */
import { type Page, devices, expect } from '@playwright/test'
import { createPikachu, setCampaign } from './creating.ts'

/**
 * A game master hosting a campaign on one phone and a player with a character
 * of that campaign on another: two browsers that share nothing but the relay.
 */
export async function table(gm: Page): Promise<{ player: Page; code: string }> {
  await setCampaign(gm, 'Dawn Patrol')
  const creationLink = await gm.locator('.dn-link').innerText()
  await gm.getByRole('button', { name: 'HOST A SESSION' }).click()
  const code = await gm.locator('.dn-join__code').innerText()
  expect(code).toMatch(/^[2-9A-Z]{6}$/)

  const browser = gm.context().browser()
  if (!browser) throw new Error('No browser to open the player’s phone in')
  const player = await (await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' })).newPage()
  await player.goto(creationLink)
  await createPikachu(player, 'Volt', 'Field kit')
  return { player, code }
}

/** The player joins with the code and asks to come in with Volt. */
export async function ask(player: Page, code: string): Promise<void> {
  await player.goto('/')
  await player.getByRole('button', { name: /JOIN A SESSION/ }).click()
  await player.getByRole('textbox', { name: 'Join code' }).fill(code)
  await player.getByRole('button', { name: 'JOIN', exact: true }).click()
  // Only the characters made for the campaign being played are offered.
  await expect(player.getByText('Choose a character of Dawn Patrol')).toBeVisible()
  await player.getByRole('button', { name: /^Volt/ }).click()
}
