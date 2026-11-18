import { type Locator, devices, expect, test } from '@playwright/test'
import { createPikachu, draftEncounter, setCampaign } from './creating.ts'
import { openTools, said } from './fighting.ts'
import { ask, table } from './hosting.ts'

/** The HP a Pokémon's row in the game master's TOOLS gives, such as "HP 15/18". */
async function hpOf(row: Locator): Promise<string> {
  const hp = /HP \d+\/\d+/.exec(await row.innerText())?.[0]
  if (!hp) throw new Error('The row gives no HP')
  return hp
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

test('an encounter is prepared from the session being hosted, and the players stay in meanwhile (decision 143)', async ({ page: gm }) => {
  const { player, code } = await table(gm)
  await ask(player, code)
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(player.getByText('Volt (you)')).toBeVisible()

  await gm.getByRole('button', { name: 'NEW ENCOUNTER' }).click()
  await draftEncounter(gm, 'The quarry')
  // The game master is on another screen, and still answers: a player's page that reloads comes straight back into the party.
  await player.reload()
  await expect(player.getByRole('heading', { name: 'In the session of Dawn Patrol' })).toBeVisible()
  await expect(player.getByText('The game master is away.')).toBeHidden()

  await gm.getByRole('button', { name: 'DONE' }).click()
  await gm.getByRole('button', { name: 'SAVE THE ENCOUNTER' }).click()
  // Back goes where the encounter was opened from: the session, as it was left, with the encounter in it.
  await gm.getByRole('button', { name: 'BACK' }).click()
  await expect(gm.locator('.dn-join__code')).toHaveText(code)
  await expect(gm.getByText('Pikachu · Lv. 5 · here')).toBeVisible()
  await expect(gm.getByRole('button', { name: /^The quarry/ })).toContainText('1 enemy · Lv. 5')

  // The campaign's page leads back to the session going on rather than to a new one.
  await gm.getByRole('button', { name: 'BACK' }).click()
  await gm.getByRole('button', { name: `BACK TO THE SESSION (${code})` }).click()
  await expect(gm.getByText('Party: 1 of 6')).toBeVisible()
  // The character that joined is still in the campaign: saving the encounter did not write over it.
  await gm.reload()
  await expect(gm.getByText('Pikachu · Lv. 5 · here')).toBeVisible()
  await expect(gm.getByRole('button', { name: /^The quarry/ })).toBeVisible()
})

test('an encounter is launched from the session, and a round is played between the game master and a player', async ({ page: gm }) => {
  const { player, code } = await table(gm)
  await gm.getByRole('button', { name: 'NEW ENCOUNTER' }).click()
  await draftEncounter(gm, 'The quarry')
  await gm.getByRole('button', { name: 'DONE' }).click()
  await gm.getByRole('button', { name: 'SAVE THE ENCOUNTER' }).click()
  await gm.getByRole('button', { name: 'BACK' }).click()

  // Nobody is in the party yet: there is no fight to launch.
  await gm.getByRole('button', { name: /^The quarry/ }).click()
  await gm.getByRole('button', { name: 'LAUNCH' }).click()
  await expect(gm.getByRole('alert')).toContainText('Nobody in the party can fight')

  await ask(player, code)
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(player.getByText('Volt (you)')).toBeVisible()

  // The launch fetches the battle engine, then both have the fight's two screens: the game master plays the enemy, the player their own.
  await gm.getByRole('button', { name: 'LAUNCH' }).click()
  await said(gm, 'What will Pikachu do?', 30_000)
  await said(player, 'What will Volt do?')
  // TOOLS, the game master's own, says how the encounter stands.
  await openTools(gm, 'The quarry · Round 1')
  const enemy = gm.getByRole('button', { name: /^A · Pikachu/ })
  await expect(enemy).toContainText('TO CHOOSE')
  const whole = await hpOf(enemy)

  // The player aims a move on the battlefield; the game master sees what was locked.
  await player.getByRole('button', { name: 'FIGHT' }).click()
  await player.getByRole('button', { name: /Thunder Shock/ }).click()
  await player.getByRole('group', { name: 'FOES' }).getByRole('button').first().click()
  await said(player, 'Volt is ready. Waiting for the others…')
  await expect(gm.getByText('Thunder Shock on Pikachu')).toBeVisible()

  // The game master picks the enemy in TOOLS and gives it its move, aimed on the battlefield: the last lock plays the round.
  await enemy.click()
  await gm.getByRole('button', { name: 'FIGHT' }).click()
  await gm.getByRole('button', { name: /^Thunder Shock/ }).click()
  await gm.getByRole('group', { name: 'PARTY' }).getByRole('button').first().click()
  // Both are told the round step by step, in the games' own words, and may pass it to choose again.
  for (const page of [gm, player]) {
    await expect(page.getByRole('listitem').filter({ hasText: 'used Thunder Shock!' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'SKIP' }).click()
  }
  await said(player, 'What will Volt do?')
  // The enemy was hit: its line in TOOLS no longer reads as it did, and the last round is listed there as it was told.
  await openTools(gm, 'The quarry · Round 2')
  await expect(gm.getByRole('button', { name: /^A · Pikachu/ })).not.toContainText(whole)
  await expect(gm.getByText('Round 1, as it went')).toBeVisible()
  await expect(gm.getByText('Volt used Thunder Shock!')).toBeVisible()

  // The session's own screen is one tap away from TOOLS, and leads back to the fight.
  await gm.getByRole('button', { name: 'THE SESSION' }).click()
  await expect(gm.locator('.dn-join__code')).toHaveText(code)
  await gm.getByRole('button', { name: 'BACK TO THE FIGHT' }).click()
  await openTools(gm, 'The quarry · Round 2')

  // The game master's page reloads: the fight was kept, and is taken up again at the same round with the same HP.
  const hurt = await hpOf(gm.getByRole('button', { name: /^A · Pikachu/ }))
  await gm.reload()
  await said(gm, 'What will Pikachu do?', 30_000)
  await openTools(gm, 'The quarry · Round 2')
  await expect(gm.getByRole('button', { name: /^A · Pikachu/ })).toContainText(hurt)
  await said(player, 'What will Volt do?')

  // The game master ends the encounter before the enemy is defeated: nothing is pre-filled (decision 160), and what they type is awarded.
  await gm.getByRole('button', { name: 'END THE ENCOUNTER' }).click()
  const exp = gm.getByRole('textbox', { name: /^EXP for Volt/ })
  await expect(exp).toHaveValue('0')
  await expect(gm.getByRole('textbox', { name: 'Pokédollars for each character' })).toHaveValue('0')
  await exp.fill('a lot')
  await expect(gm.getByRole('button', { name: 'AWARD AND END' })).toBeDisabled()
  await exp.fill('50')
  await gm.getByRole('textbox', { name: 'Pokédollars for each character' }).fill('100')
  await gm.getByRole('button', { name: 'AWARD AND END' }).click()

  // The fight is closed for everyone; the player is told what Volt received, and Volt's sheet has it.
  await expect(gm.locator('.dn-join__code')).toHaveText(code)
  await expect(player.getByText('The quarry is over. Volt received 50 EXP and 100 Pokédollars.')).toBeVisible()
  await player.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(player.getByText('The quarry is over.')).toBeHidden()
  await expect(player.getByText('Volt (you)')).toBeVisible()
  // The fight is gone from the game master's device too: a reload shows the session, not a fight.
  await gm.reload()
  await expect(gm.locator('.dn-join__code')).toHaveText(code)
  await expect(gm.getByRole('button', { name: 'END THE ENCOUNTER' })).toBeHidden()
})

test('a join link opens the join screen with its code, and a code that is none says so', async ({ page }) => {
  await page.goto('/#DNJ1.NOTACODE')
  await expect(page.getByRole('heading', { name: 'Join a session' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Join code' }).fill('AAAAAA')
  await page.getByRole('button', { name: 'JOIN', exact: true }).click()
  await expect(page.getByText('This is not a join code.')).toBeVisible()
})
