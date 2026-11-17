/** What the browser tests of a session share: a game master hosting on one phone, a player with a character on another. */
import { type Page, devices, expect } from '@playwright/test'
import { createPikachu, setCampaign } from './creating.ts'
import { openHome } from './home.ts'

/**
 * A game master hosting a campaign on one phone and a player with a character
 * of that campaign on another: two browsers that share nothing but the relay.
 */
export async function table(gm: Page): Promise<{ player: Page; code: string; link: string }> {
  await setCampaign(gm, 'Dawn Patrol')
  const link = await gm.locator('.dn-link').innerText()
  await gm.getByRole('button', { name: 'HOST A SESSION' }).click()
  const code = await gm.locator('.dn-join__code').innerText()
  expect(code).toMatch(/^[2-9A-Z]{6}$/)
  return { player: await newPlayer(gm, link, 'Volt'), code, link }
}

/** Another phone, with a Pikachu of the campaign made from its creation link. */
export async function newPlayer(gm: Page, link: string, name: string): Promise<Page> {
  const browser = gm.context().browser()
  if (!browser) throw new Error('No browser to open the player’s phone in')
  const player = await (await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' })).newPage()
  await player.goto(link)
  await createPikachu(player, name, 'Field kit')
  return player
}

/** The player joins with the code and asks to come in with their character, Volt unless named otherwise. */
export async function ask(player: Page, code: string, name = 'Volt'): Promise<void> {
  await openHome(player)
  await player.getByRole('button', { name: 'JOIN', exact: true }).click()
  await player.getByRole('textbox', { name: 'Join code' }).fill(code)
  await player.getByRole('button', { name: 'JOIN', exact: true }).click()
  // Only the characters made for the campaign being played are offered.
  await expect(player.getByText('Choose a character of Dawn Patrol')).toBeVisible()
  await player.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}
