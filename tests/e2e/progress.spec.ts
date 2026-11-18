import { expect, test } from '@playwright/test'
import { openSheetOf } from './characters.ts'
import { draftEncounter } from './creating.ts'
import { openTools, said } from './fighting.ts'
import { openHome } from './home.ts'
import { ask, newPlayer, table } from './hosting.ts'

test('between two fights a character places points, receives what the game master gives, evolves, rests and changes what it holds', async ({ page: gm }) => {
  const { player, code } = await table(gm)
  await ask(player, code)
  await gm.getByRole('group', { name: 'Volt' }).getByRole('button', { name: 'LET IN' }).click()
  await expect(player.getByText('Volt (you)')).toBeVisible()
  const yours = player.getByRole('group', { name: 'Your character' })
  // No rest was started, so the Pokémon Center is not offered.
  await expect(yours.getByRole('button', { name: /^POKÉMON CENTER/ })).toBeHidden()

  // Points: a level-5 character made without placing any has all of them left. Two go to Speed, for good.
  await expect(yours.getByRole('button', { name: /^PLACE POINTS/ })).toContainText('To place: 9 IV · 25 EV · 4 roleplay')
  await yours.getByRole('button', { name: /^PLACE POINTS/ }).click()
  await expect(player.getByRole('heading', { name: 'Volt: points' })).toBeVisible()
  const ivs = player.getByRole('group', { name: /^IVs/ })
  await expect(player.getByRole('button', { name: 'PLACE', exact: true })).toBeDisabled()
  await ivs.getByRole('button', { name: 'Raise Speed' }).click()
  await ivs.getByRole('button', { name: 'Raise Speed' }).click()
  await expect(ivs.getByText('IVs: 7 left to place')).toBeVisible()
  await player.getByRole('button', { name: 'PLACE', exact: true }).click()
  await expect(player.getByRole('alert')).toHaveText('Place these 2 points? They can never be moved.')
  await player.getByRole('button', { name: 'PLACE', exact: true }).click()
  await expect(player.getByText('The points are placed.')).toBeVisible()
  // What is placed is now the lowest Speed goes.
  await expect(ivs.getByRole('button', { name: 'Lower Speed' })).toBeDisabled()
  await player.getByRole('button', { name: 'BACK' }).click()
  await expect(yours.getByRole('button', { name: /^PLACE POINTS/ })).toContainText('To place: 7 IV · 25 EV · 4 roleplay')

  // The game master gives EXP, a Thunder Stone and Leftovers by hand; the player is told, and the level follows.
  await gm.getByRole('button', { name: /^Volt/ }).click()
  await gm.getByRole('button', { name: 'GIVE OR TAKE' }).click()
  await expect(gm.getByRole('heading', { name: 'Give or take: Volt' })).toBeVisible()
  await expect(gm.getByRole('button', { name: 'CONFIRM' })).toBeDisabled()
  await gm.getByRole('textbox', { name: 'EXP to give' }).fill('300')
  await expect(gm.getByText('Reaches level 7.')).toBeVisible()
  for (const [typed, name] of [['thunder stone', /^Thunder Stone/], ['leftovers', /^Leftovers/]] as const) {
    await gm.getByRole('searchbox', { name: 'Add an item' }).fill(typed)
    await gm.getByRole('button', { name }).click()
  }
  await gm.getByRole('button', { name: 'CONFIRM' }).click()
  await expect(gm.getByText('Volt’s sheet is changed. Its player is told.')).toBeVisible()
  await expect(gm.getByText('Pikachu · Lv. 7 · here')).toBeVisible()
  await expect(player.getByText('The game master gave Volt: 300 EXP, Thunder Stone ×1, Leftovers ×1. Volt is now level 7!')).toBeVisible()
  await player.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(player.getByText('The game master gave Volt')).toBeHidden()

  // Evolution: the stone is in its Bag now, so Raichu is ready; evolving uses the stone up.
  await expect(yours.getByRole('button', { name: /^EVOLVE/ })).toContainText('Ready to evolve into Raichu.')
  await yours.getByRole('button', { name: /^EVOLVE/ }).click()
  await player.getByRole('button', { name: /^Raichu/ }).click()
  await expect(player.getByRole('alert')).toHaveText('Evolve Volt into Raichu?')
  await expect(player.getByText('Used up: Thunder Stone ×1.')).toBeVisible()
  await player.getByRole('button', { name: 'EVOLVE', exact: true }).click()
  await expect(player.getByText('Congratulations! Volt evolved into Raichu!')).toBeVisible()
  await expect(player.getByText('Raichu has no evolution to come.')).toBeVisible()
  await expect(gm.getByText('Raichu · Lv. 7 · here')).toBeVisible()
  await player.getByRole('button', { name: 'BACK' }).click()
  await expect(yours.getByRole('button', { name: /^EVOLVE/ })).toBeHidden()

  // The Bag: Leftovers can be held, and put away again; a Potion has nobody to heal, so it cannot be used on Volt.
  await yours.getByRole('button', { name: /^BAG/ }).click()
  await expect(player.getByRole('button', { name: /^Thunder Stone/ })).toBeHidden()
  await player.getByRole('button', { name: /^Leftovers/ }).click()
  await player.getByRole('button', { name: 'HOLD', exact: true }).click()
  await expect(player.getByText('Volt now holds: Leftovers.')).toBeVisible()
  await expect(player.getByRole('button', { name: /^Leftovers/ })).toBeHidden()
  await player.getByRole('button', { name: /^Potion/ }).click()
  await player.getByRole('button', { name: 'USE', exact: true }).click()
  await expect(player.getByText('Potion: on whom?')).toBeVisible()
  await expect(player.getByRole('button', { name: /^Volt \(you\)/ })).toBeDisabled()
  await player.getByRole('button', { name: 'BACK' }).click()
  await player.getByRole('button', { name: 'PUT AWAY' }).click()
  await expect(player.getByText('Volt now holds nothing.')).toBeVisible()
  await expect(player.getByRole('button', { name: /^Leftovers/ })).toBeVisible()
  await player.getByRole('button', { name: 'BACK' }).click()

  // A rest: the game master starts it, and Volt's player chooses its Ability again, once.
  await gm.getByRole('button', { name: /^Volt/ }).click()
  await gm.getByRole('button', { name: 'REST', exact: true }).click()
  await expect(gm.getByText(/^Volt rested at the Pokémon Center/)).toBeVisible()
  await expect(gm.getByText('Raichu · Lv. 7 · here · resting')).toBeVisible()
  await yours.getByRole('button', { name: /^POKÉMON CENTER/ }).click()
  await expect(player.getByRole('heading', { name: 'Volt: Pokémon Center' })).toBeVisible()
  await player.getByRole('button', { name: /^Lightning Rod/ }).click()
  await player.getByRole('button', { name: 'CONFIRM' }).click()
  await expect(player.getByText('Its Ability and its moves are set. The rest is over.')).toBeVisible()
  await expect(gm.getByText('Raichu · Lv. 7 · here · resting')).toBeHidden()
  await player.getByRole('button', { name: 'BACK' }).click()
  await expect(yours.getByRole('button', { name: /^POKÉMON CENTER/ })).toBeHidden()

  // Everything asked was the game master's side's to grant, and the device keeps the copy it gave back: a reload shows the same sheet.
  await player.reload()
  await expect(yours.getByRole('button', { name: /^PLACE POINTS/ })).toBeVisible()
  await openHome(player)
  await player.getByRole('button', { name: /CHARACTERS/ }).click()
  await openSheetOf(player, 'Volt')
  await expect(player.getByText('Lightning Rod', { exact: true })).toBeVisible()
  await expect(player.getByText('Raichu', { exact: true })).toBeVisible()
})

test('a Pokémon downed in a fight stays down after it, its Bag opens to its teammate, and a Revive given by the game master brings it back', async ({ page: gm }) => {
  test.setTimeout(120_000)
  const { player: volt, code, link } = await table(gm)
  const bolt = await newPlayer(gm, link, 'Bolt')

  // An encounter with one enemy far above the party: its first move downs whoever it hits.
  await gm.getByRole('button', { name: 'NEW ENCOUNTER' }).click()
  await draftEncounter(gm, 'The ambush')
  await gm.getByRole('button', { name: /^Level/ }).click()
  await gm.getByRole('spinbutton', { name: 'Level' }).fill('60')
  await gm.getByRole('button', { name: 'DONE' }).click()
  await gm.getByRole('button', { name: 'DONE' }).click()
  await gm.getByRole('button', { name: 'SAVE THE ENCOUNTER' }).click()
  await gm.getByRole('button', { name: 'BACK' }).click()

  for (const [player, name] of [[volt, 'Volt'], [bolt, 'Bolt']] as const) {
    await ask(player, code, name)
    await gm.getByRole('group', { name }).getByRole('button', { name: 'LET IN' }).click()
    await expect(player.getByText(`${name} (you)`)).toBeVisible()
  }

  // The fight: both players lock, the enemy strikes Volt, and Volt goes down.
  await gm.getByRole('button', { name: /^The ambush/ }).click()
  await gm.getByRole('button', { name: 'LAUNCH' }).click()
  await said(gm, 'What will Pikachu do?', 30_000)
  for (const player of [volt, bolt]) await player.getByRole('button', { name: 'WAIT', exact: true }).click()
  await gm.getByRole('button', { name: 'FIGHT' }).click()
  await gm.getByRole('button', { name: /^Thunder Shock/ }).click()
  await gm.getByRole('group', { name: 'PARTY' }).getByRole('button', { name: /Volt/ }).click()
  await gm.getByRole('button', { name: 'SKIP' }).click()
  await openTools(gm, 'The ambush · Round 2')
  await expect(gm.getByText('Volt is down!')).toBeVisible()

  // The encounter ends with nothing awarded: everyone is left as the fight left them (decision 136).
  await gm.getByRole('button', { name: 'END THE ENCOUNTER' }).click()
  await gm.getByRole('button', { name: 'AWARD AND END' }).click()
  for (const player of [volt, bolt]) await player.getByRole('button', { name: 'OK', exact: true }).click()

  // Volt, down, can do nothing with its own Bag; Bolt finds it open, and takes its Potion.
  await volt.getByRole('group', { name: 'Your character' }).getByRole('button', { name: /^BAG/ }).click()
  await expect(volt.getByText('Volt is down: it cannot use items, take them, or change what it holds.')).toBeVisible()
  await bolt.getByRole('group', { name: 'Your character' }).getByRole('button', { name: /^BAG/ }).click()
  const voltsBag = bolt.getByRole('group', { name: 'Volt’s Bag' })
  await voltsBag.getByRole('button', { name: /^Potion/ }).click()
  await bolt.getByRole('button', { name: 'TAKE', exact: true }).click()
  await expect(bolt.getByText('Bolt took Potion ×1 from Volt’s Bag.')).toBeVisible()
  await expect(bolt.getByRole('button', { name: /^Potion ×2/ })).toBeVisible()
  await expect(voltsBag.getByText('The bag is empty.')).toBeVisible()

  // The game master gives Bolt a Revive; Bolt uses it on Volt, the only one it would do something for.
  await gm.getByRole('button', { name: /^Bolt/ }).click()
  await gm.getByRole('button', { name: 'GIVE OR TAKE' }).click()
  await gm.getByRole('searchbox', { name: 'Add an item' }).fill('revive')
  await gm.getByRole('button', { name: /^Revive/ }).first().click()
  await gm.getByRole('button', { name: 'CONFIRM' }).click()
  await bolt.getByRole('button', { name: 'BACK' }).click()
  await expect(bolt.getByText('The game master gave Bolt: Revive ×1.')).toBeVisible()
  await bolt.getByRole('button', { name: 'OK', exact: true }).click()
  await bolt.getByRole('group', { name: 'Your character' }).getByRole('button', { name: /^BAG/ }).click()
  await bolt.getByRole('button', { name: /^Revive/ }).click()
  await bolt.getByRole('button', { name: 'USE', exact: true }).click()
  await expect(bolt.getByRole('button', { name: /^Bolt \(you\)/ })).toBeDisabled()
  await bolt.getByRole('button', { name: /^Volt/ }).click()
  await expect(bolt.getByText('Bolt used the Revive on Volt.')).toBeVisible()
  // Volt is back on its feet: its Bag closes to Bolt, and is its own again.
  await expect(voltsBag).toBeHidden()
  await expect(volt.getByText('Volt is down: it cannot use items, take them, or change what it holds.')).toBeHidden()
})

