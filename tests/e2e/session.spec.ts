import { type Page, devices, expect, test } from '@playwright/test'
import { createPikachu, setCampaign } from './creating.ts'

/**
 * A game master hosting a campaign on one phone and a player with a character
 * of that campaign on another: two browsers that share nothing but the relay.
 */
async function table(gm: Page): Promise<{ player: Page; code: string }> {
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
async function ask(player: Page, code: string): Promise<void> {
  await player.goto('/')
  await player.getByRole('button', { name: /JOIN A SESSION/ }).click()
  await player.getByRole('textbox', { name: 'Join code' }).fill(code)
  await player.getByRole('button', { name: 'JOIN', exact: true }).click()
  // Only the characters made for the campaign being played are offered.
  await expect(player.getByText('Choose a character of Dawn Patrol')).toBeVisible()
  await player.getByRole('button', { name: /^Volt/ }).click()
}

test('a player joins a session with its code, is let in, and stays in while the game master’s page reloads', async ({ page: gm }) => {
  const { player, code } = await table(gm)
  await ask(player, code)
  await expect(player.getByText('Your request is in front of the game master.')).toBeVisible()

  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(gm.getByText('Party: 1 of 6')).toBeVisible()
  await expect(gm.getByText('Pikachu · Lv. 5 · here')).toBeVisible()
  await expect(player.getByRole('heading', { name: 'In the session of Dawn Patrol' })).toBeVisible()
  await expect(player.getByText('Volt (you)')).toBeVisible()

  // The game master's page reloads: the same code, and the member is back without being asked again (decision 122).
  await gm.reload()
  await expect(gm.locator('.dn-join__code')).toHaveText(code)
  await expect(gm.getByText('Pikachu · Lv. 5 · here')).toBeVisible()
  await expect(gm.getByText('Nobody is asking to come in.')).toBeVisible()
  await expect(player.getByText('Volt (you)')).toBeVisible()

  // The player's page reloads too: it comes back as the same player, straight into the party.
  await player.reload()
  await expect(player.getByRole('heading', { name: 'In the session of Dawn Patrol' })).toBeVisible()
  await expect(gm.getByText('Party: 1 of 6')).toBeVisible()
})

test('a player sent away may ask again, a request may be refused, and ending the session lets everyone go', async ({ page: gm }) => {
  const { player, code } = await table(gm)
  await ask(player, code)
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(player.getByText('Volt (you)')).toBeVisible()

  // Removed (decision 123): told, and free to ask again.
  await gm.getByRole('button', { name: /^Volt/ }).click()
  await gm.getByRole('button', { name: 'REMOVE FROM THE SESSION' }).click()
  await expect(gm.getByText('Party: 0 of 6')).toBeVisible()
  await expect(player.getByRole('alert')).toContainText('took your character out of the session')

  await player.getByRole('button', { name: 'TRY AGAIN' }).click()
  await player.getByRole('button', { name: /^Volt/ }).click()
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'REFUSE' }).click()
  await expect(player.getByRole('alert')).toContainText('did not let this character in')

  // A third request waits while the game master ends the session.
  await player.getByRole('button', { name: 'TRY AGAIN' }).click()
  await player.getByRole('button', { name: /^Volt/ }).click()
  await expect(gm.getByRole('group', { name: 'Volt' })).toBeVisible()
  await gm.getByRole('button', { name: 'END THE SESSION' }).click()
  await gm.getByRole('button', { name: 'END IT' }).click()
  await expect(player.getByRole('alert')).toContainText('The session is over.')

  // The code means nothing any more, and the next session gets another.
  await player.getByRole('button', { name: 'TRY AGAIN' }).click()
  await expect(player.getByRole('alert')).toContainText('No session has this code.')
  await gm.getByRole('button', { name: 'HOST A SESSION' }).click()
  await expect(gm.locator('.dn-join__code')).not.toHaveText(code)
})

test('a player with no character makes one from the join screen, and asks to come in with it (decision 128)', async ({ page: gm }) => {
  await setCampaign(gm, 'Dawn Patrol')
  await gm.getByRole('button', { name: 'HOST A SESSION' }).click()
  const code = await gm.locator('.dn-join__code').innerText()
  const browser = gm.context().browser()
  if (!browser) throw new Error('No browser to open the player’s phone in')
  // A phone that never opened the campaign's creation link: all it has is the join code.
  const player = await (await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' })).newPage()
  await player.goto(`/#DNJ1.${code}`)
  await expect(player.getByText('No character of Dawn Patrol is on this device yet.')).toBeVisible()

  await player.getByRole('button', { name: 'CREATE A CHARACTER' }).click()
  await createPikachu(player, 'Volt', 'Field kit')
  // Back in the session with the character just made: no second choice to make.
  await expect(player.getByText('Your request is in front of the game master.')).toBeVisible()
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(player.getByText('Volt (you)')).toBeVisible()
  await expect(gm.getByText('Pikachu · Lv. 5 · here')).toBeVisible()
})

test('a join link opens the join screen with its code, and a code that is none says so', async ({ page }) => {
  await page.goto('/#DNJ1.NOTACODE')
  await expect(page.getByRole('heading', { name: 'Join a session' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Join code' }).fill('AAAAAA')
  await page.getByRole('button', { name: 'JOIN', exact: true }).click()
  await expect(page.getByText('This is not a join code.')).toBeVisible()
})
