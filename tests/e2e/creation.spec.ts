import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { openFile } from '../../src/storage/files.ts'
import { settled } from './accessible.ts'
import { code, createPikachu, expectStep, placeAttributes, saveNewCampaign } from './creating.ts'

test('a creation link opens the campaign, and the character made is kept on the device', async ({ page, context }) => {
  await page.goto(`/#${code}`)
  // The code leaves the address once it is taken, so that a reload does not open it again.
  await expect(page).toHaveURL(/\/characters\/new\/e2eCampaign00001$/)
  await createPikachu(page, 'Volt')

  // Its icon in the list's strip, and what is told of it beside it: the one shown, the only one there.
  const volt = page.getByRole('button', { name: /^Volt/ })
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
  await expect(volt).toBeVisible()
  await expect(page.getByText('Lv. 5', { exact: true })).toBeVisible()
  await expect(page.getByText('Pikachu', { exact: true })).toBeVisible()
  await expect(page.getByText('Night Shift', { exact: true })).toBeVisible()

  // Still there after a reload, and with no network: it is in the browser's storage, not in memory.
  await page.reload()
  await expect(volt).toBeVisible()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'BACK' }).click()
  await page.getByRole('button', { name: /CHARACTERS/ }).click()
  await expect(volt).toBeVisible()
})

test('a campaign opened once is offered again, and a pasted link opens too', async ({ page }) => {
  await page.goto('/characters/new')
  await expectStep(page, 'Campaign')
  // No campaign on the device: the wheel holds only the way to make one (decision 299).
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option', { name: 'New campaign', selected: true })).toBeVisible()
  await page.getByRole('button', { name: 'LINK', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Creation link' }).fill(`https://example.test/#${code}`)
  await page.getByRole('dialog').getByRole('button', { name: 'OPEN' }).click()
  // The campaign the link names is on the wheel, in its middle.
  await expect(page.getByRole('option', { name: 'Night Shift', selected: true })).toBeVisible()
  await page.getByRole('button', { name: 'CREATE', exact: true }).click()
  await expectStep(page, 'Pokémon')
  await expect(page).toHaveURL(/\/characters\/new\/e2eCampaign00001$/)

  // Back at the campaigns by the bar of steps: the one opened is offered.
  await page.getByRole('navigation', { name: 'Steps of creation' }).getByRole('button', { name: 'Campaign', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Night Shift', selected: true })).toBeVisible()
})

test('+ New makes a campaign on its own page, and creation goes on with it once it is saved (decision 299)', async ({ page }) => {
  await page.goto('/characters/new')
  // The way to make a campaign is the last row, after the campaigns the device has.
  await page.getByRole('button', { name: 'LINK', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Creation link' }).fill(`https://example.test/#${code}`)
  await page.getByRole('dialog').getByRole('button', { name: 'OPEN' }).click()
  await expect(page.getByRole('option')).toHaveText([/Night Shift/, /New/])
  await page.getByRole('listbox', { name: 'Campaigns' }).press('End')
  await expect(page.getByRole('option', { name: 'New campaign', selected: true })).toBeVisible()
  await page.getByRole('button', { name: 'CREATE', exact: true }).click()

  await expect(page).toHaveURL(/\/campaigns\/new\?for=character$/)
  await saveNewCampaign(page, 'Dawn Patrol')
  await expect(page).toHaveURL(/\/characters\/new\/[A-Za-z0-9_-]{16}$/)
  await expectStep(page, 'Pokémon')
  // Back at the campaigns, the new one is on the wheel, before the way to make another.
  await page.getByRole('navigation', { name: 'Steps of creation' }).getByRole('button', { name: 'Campaign', exact: true }).click()
  await expect(page.getByRole('option', { name: /Dawn Patrol/, selected: true })).toBeVisible()
  await expect(page.getByRole('option').last()).toHaveText(/New/)
})

test('leaving the new campaign\'s page unsaved goes back to creation', async ({ page }) => {
  await page.goto('/characters/new')
  await page.getByRole('button', { name: 'CREATE', exact: true }).click()
  await expect(page).toHaveURL(/\/campaigns\/new\?for=character$/)
  await page.getByRole('button', { name: 'BACK' }).click()
  await expectStep(page, 'Campaign')
})

test('the back arrow goes back one step at a time, then leaves the Pokédex (decision 300)', async ({ page }) => {
  await page.goto(`/#${code}`)
  await expectStep(page, 'Pokémon')
  await page.getByRole('button', { name: 'NEXT', exact: true }).click()
  await expectStep(page, 'Identity')
  await page.getByRole('button', { name: 'Previous step' }).click()
  await expectStep(page, 'Pokémon')
  await page.getByRole('button', { name: 'Previous step' }).click()
  await expectStep(page, 'Campaign')
  // The campaign is still the one chosen, though nothing was made for it yet.
  await expect(page.getByRole('option', { name: /Night Shift/, selected: true })).toBeVisible()
  await page.getByRole('button', { name: 'Leave the Pokédex' }).click()
  await expect(page.getByRole('heading', { name: 'Characters' })).toBeVisible()
})

test('the filters keep a generation and a stage of evolution, and say how many Pokémon are left', async ({ page }) => {
  const tray = page.getByRole('dialog')
  await page.goto(`/#${code}`)
  await expectStep(page, 'Pokémon')
  await page.getByRole('button', { name: 'FILTER', exact: true }).click()
  const left = tray.getByRole('status')
  const all = await left.innerText()
  await tray.getByRole('button', { name: /^Stage of evolution/ }).click()
  await tray.getByRole('button', { name: 'FINAL', exact: true }).click()
  await expect(tray.getByRole('button', { name: /^Stage of evolution/ })).toContainText('FINAL')
  await expect(left).not.toHaveText(all)
  await tray.getByRole('button', { name: /^Generation/ }).click()
  await tray.getByRole('button', { name: 'Gen 1', exact: true }).click()
  await expect(tray.getByRole('button', { name: /^Generation/ })).toContainText('Gen 1')
  // Several moves, every one of which a Pokémon kept can choose: + adds the move in the middle, − takes it off.
  await tray.getByRole('button', { name: /^Can choose the moves/ }).click()
  await tray.getByRole('button', { name: /^Add / }).click()
  await expect(tray.getByRole('heading')).toHaveText('Can choose the moves 1/6')
  await tray.getByRole('listbox').press('ArrowDown')
  await tray.getByRole('button', { name: /^Add / }).click()
  await expect(tray.getByRole('heading')).toHaveText('Can choose the moves 2/6')
  await tray.getByRole('button', { name: /^Take .* off$/ }).click()
  await expect(tray.getByRole('heading')).toHaveText('Can choose the moves 1/6')
  // NONE takes every move kept off; CLEAR only takes the wheel back to every move.
  await tray.getByRole('button', { name: 'NONE (take every move off)' }).click()
  await expect(tray.getByRole('heading')).toHaveText('Can choose the moves 0/6')
  await tray.getByRole('button', { name: /^Add / }).click()
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(tray.getByRole('button', { name: /^Can choose the moves/ })).not.toContainText('ANY')
  // CLEAR takes every filter off.
  await tray.getByRole('button', { name: 'CLEAR', exact: true }).click()
  await expect(left).toHaveText(all)
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('button', { name: 'FILTER', exact: true })).not.toHaveAttribute('aria-pressed', 'true')
})

test('a creation link shows the loading screen while creation is fetched, never the home', async ({ page }) => {
  // Notes it if the home's menu is ever drawn while the link is taken.
  await page.addInitScript({
    content: `window.homeSeen = false; new MutationObserver(() => { if (document.querySelector('nav[aria-label="Denborn"]')) window.homeSeen = true }).observe(document, { childList: true, subtree: true })`,
  })
  // Creation's code comes slowly, as on a slow phone or a busy machine.
  await page.route('**/assets/pages-characters-*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    await route.continue()
  })
  await page.goto(`/#${code}`)
  await expect(page.getByRole('navigation', { name: 'Steps of creation' }).getByRole('button', { name: 'Pokémon', exact: true })).toHaveAttribute('aria-current', 'step', { timeout: 15_000 })
  expect(await page.evaluate('window.homeSeen')).toBe(false)
})

test('a link that cannot be read says why, and opens nothing', async ({ page }) => {
  await page.goto(`/#${code.slice(0, -10)}`)
  await expect(page.getByRole('alert')).toHaveText('This link is incomplete or was altered. Ask for it again.')
  await expect(page.getByRole('option')).toHaveCount(1)

  await page.getByRole('button', { name: 'LINK', exact: true }).click()
  await page.getByRole('dialog').getByRole('textbox', { name: 'Creation link' }).fill('hello')
  await page.getByRole('dialog').getByRole('button', { name: 'OPEN' }).click()
  await expect(page.getByRole('dialog').getByText('This is not a creation link.')).toBeVisible()
  // Escape shuts what came over the screen, and the focus is back on what opened it.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: 'LINK', exact: true })).toBeFocused()
})

test('going back by the bar of steps loses nothing, and another Pokémon starts its moves over', async ({ page }) => {
  const steps = page.getByRole('navigation', { name: 'Steps of creation' })
  const next = page.getByRole('button', { name: 'NEXT', exact: true })
  const tray = page.getByRole('dialog')
  await page.goto(`/#${code}`)
  await expectStep(page, 'Pokémon')
  // Nothing is chosen yet: the steps further on cannot be gone to.
  await expect(steps.getByRole('button', { name: 'Moves', exact: true })).toBeDisabled()

  // As far as the item pack, with a move chosen.
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click()
  await tray.getByRole('searchbox').fill('pika')
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await next.click()
  await page.getByRole('textbox', { name: 'Nickname' }).fill('Volt')
  await page.getByRole('button', { name: 'Female', exact: true }).click()
  // The attributes start at 5: 30 placed of the 269 a level-5 character has; the rest may wait (decision 307).
  await expect(page.getByRole('status', { name: '235 of the 265 points are left to place. They can wait.' })).toHaveText('30/269')
  await expect(next).toBeEnabled()
  // MAX takes an attribute as high as the points left allow (75 and the level's 4 extra ones), MIN back to 5 (decision 303).
  const strength = page.getByRole('spinbutton', { name: /\(Strength\)/ })
  await page.getByRole('button', { name: 'MAX (Strength)' }).click()
  await expect(strength).toHaveValue('79')
  await page.getByRole('button', { name: 'MIN (Strength)' }).click()
  await expect(strength).toHaveValue('5')
  await placeAttributes(page)
  await page.getByRole('button', { name: 'Raise Strength', exact: true }).click()
  await expect(page.getByRole('status', { name: 'All 265 points are placed.' })).toHaveText('266/269')
  await next.click()
  await expectStep(page, 'Combat')
  await page.getByRole('group', { name: 'Ability' }).getByRole('button', { name: 'Static', exact: true }).click()
  await next.click()
  await expectStep(page, 'Training Value')
  await page.getByRole('group', { name: 'Raises' }).getByRole('button', { name: 'SPE (Speed)', exact: true }).click()
  await page.getByRole('group', { name: 'Lowers' }).getByRole('button', { name: 'SPE (Speed)', exact: true }).click()
  // The same stat raised and lowered: a nature that changes nothing.
  await expect(page.getByRole('status').filter({ hasText: 'Serious: changes nothing' })).toBeAttached()
  await page.getByRole('button', { name: 'Raise Speed', exact: true }).click()
  await expect(page.getByRole('status', { name: /^TV: 14 of 15 left/ })).toHaveText('1/15')
  await next.click()
  await page.getByRole('button', { name: 'Move 1: empty' }).click()
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Move 1: (?!empty)/ })).toBeVisible()
  // The cross on a filled place empties it (decision 308); the place is filled again for what follows.
  await page.getByRole('button', { name: /^Take .* off$/ }).click()
  await expect(page.getByRole('button', { name: 'Move 1: empty' })).toBeVisible()
  await page.getByRole('button', { name: 'Move 1: empty' }).click()
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('button', { name: /^Move 1: (?!empty)/ })).toBeVisible()
  await next.click()
  await expectStep(page, 'Item pack')

  // Back to who it is: the name, the sex, the attributes and the nature are as they were left.
  await steps.getByRole('button', { name: 'Identity', exact: true }).click()
  await expectStep(page, 'Identity')
  await expect(page.getByRole('textbox', { name: 'Nickname' })).toHaveValue('Volt')
  await expect(page.getByRole('button', { name: 'Female', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('spinbutton', { name: /\(Strength\)/ })).toHaveValue('46')
  await steps.getByRole('button', { name: 'Training Value', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Serious: changes nothing' })).toBeAttached()
  await expect(page.getByRole('spinbutton', { name: 'Speed' })).toHaveValue('1')

  // Another Pokémon has other moves: they start over, and the steps after them shut until one is chosen again.
  await steps.getByRole('button', { name: 'Pokémon', exact: true }).click()
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click()
  await tray.getByRole('searchbox').fill('eevee')
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Eevee', selected: true })).toBeVisible()
  await next.click()
  await expectStep(page, 'Identity')
  await next.click()
  await expectStep(page, 'Combat')
  // Its Ability is not one the new Pokémon can have: the new Pokémon's first takes its place (decision 304); its moves start over.
  await expect(page.getByRole('group', { name: 'Ability' }).getByRole('button').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(steps.getByRole('button', { name: 'Moves', exact: true })).toBeEnabled()
  await expect(steps.getByRole('button', { name: 'Item pack', exact: true })).toBeDisabled()
  await steps.getByRole('button', { name: 'Moves', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Move 1: empty' })).toBeVisible()
})

// The trial of decision 304: take this test away with BIG_STEP (src/features/creation/big-step.ts).
test('beside each plus and minus, a second pair moves a roleplay attribute or a TV by 5', async ({ page }) => {
  await page.goto(`/#${code}`)
  await page.getByRole('button', { name: 'NEXT', exact: true }).click()
  await expectStep(page, 'Identity')
  const strength = page.getByRole('spinbutton', { name: /\(Strength\)/ })
  await page.getByRole('button', { name: 'Raise Strength by 5' }).click()
  await expect(strength).toHaveValue('10')
  await page.getByRole('button', { name: 'Lower Strength by 5' }).click()
  await expect(strength).toHaveValue('5')
})

test('a press on a row of a wheel brings it to the middle, and a press on the one in the middle chooses it', async ({ page }) => {
  await page.goto(`/#${code}`)
  await expectStep(page, 'Pokémon')
  // The rows are drawn under the surface that scrolls: a finger lands on that surface, which knows the row under it. So the
  // press is made where the row is drawn, once the screen has come to rest.
  await settled(page)
  const middle = page.getByRole('option', { selected: true })
  await expect(middle).toHaveText(/Bulbasaur/)
  await page.getByRole('option', { name: /Venusaur/ }).click({ force: true })
  await expect(middle).toHaveText(/Venusaur/)
  // Nothing is chosen by the wheel coming to rest.
  await expectStep(page, 'Pokémon')
  await settled(page)
  await middle.click({ force: true })
  await expectStep(page, 'Identity')
  await expect(page.getByRole('textbox', { name: 'Nickname' })).toHaveAttribute('placeholder', 'Venusaur')
})

test('no step of creation is longer than its screen, and with reduced motion each is there at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const next = page.getByRole('button', { name: 'NEXT', exact: true })
  const tray = page.getByRole('dialog')
  /** Nothing on the two screens is on its way in or out, and neither holds more than it shows. */
  const whole = async (step: string): Promise<void> => {
    await expectStep(page, step)
    expect(await page.evaluate<number>("document.querySelectorAll('.dn-dual__layer[inert], .dn-dual__layer[data-moving]').length"), step).toBe(0)
    const longer = await page.evaluate<string[]>("[...document.querySelectorAll('.dn-screen__stage')].filter((stage) => stage.scrollHeight > stage.clientHeight + 1 || stage.scrollWidth > stage.clientWidth + 1).map((stage) => stage.parentElement.getAttribute('aria-label'))")
    expect(longer, step).toEqual([])
  }
  await page.goto('/characters/new')
  await whole('Campaign')
  await page.goto(`/#${code}`)
  await whole('Pokémon')
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click()
  await tray.getByRole('searchbox').fill('pika')
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await next.click()
  await whole('Identity')
  // The longest name a character can have.
  await page.getByRole('textbox', { name: 'Nickname' }).fill('Abcdefghijklmnopqrstuvwx')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await placeAttributes(page)
  await whole('Identity')
  await next.click()
  await whole('Combat')
  await page.getByRole('group', { name: 'Ability' }).getByRole('button', { name: 'Lightning Rod' }).click()
  await whole('Combat')
  await next.click()
  await whole('Training Value')
  await page.getByRole('group', { name: 'Raises' }).getByRole('button', { name: 'ATK (Attack)', exact: true }).click()
  await page.getByRole('group', { name: 'Lowers' }).getByRole('button', { name: 'SPD (Special Defense)', exact: true }).click()
  await whole('Training Value')
  await next.click()
  await whole('Moves')
  await page.getByRole('button', { name: 'Move 1: empty' }).click()
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await next.click()
  await whole('Item pack')
  await page.getByRole('button', { name: 'SELECT', exact: true }).click()
  await next.click()
  await whole('A last look')
})

test('the page says so when the browser refuses to keep anything', async ({ page }) => {
  // A browser that refuses its storage, as in some private modes.
  await page.addInitScript({
    content: `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('refused', 'SecurityError') } })`,
  })
  await page.goto('/characters')
  await expect(page.getByRole('alert')).toContainText('This browser does not let the app keep anything.')
})

test('a character the device has no room for is offered as a file at once', async ({ page }) => {
  // The storage takes the campaign but has no room left when the character comes.
  await page.addInitScript({
    content: `const setItem = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('denborn/character/')) throw new DOMException('full', 'QuotaExceededError')
        setItem.call(this, key, value)
      }`,
  })
  await page.goto(`/#${code}`)
  await createPikachu(page, 'Volt')
  await expect(page.getByRole('alert')).toContainText('There is no room left on this device to keep it.')

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'SAVE THE FILE' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('denborn-volt.json')
  // The file is the whole character with its rules: it opens as one.
  const opened = openFile(readFileSync(await download.path(), 'utf8'))
  expect(opened).toMatchObject({ kind: 'character', read: { ok: true, value: { nickname: 'Volt', level: 5, rules: { version: 3 } } } })
})
