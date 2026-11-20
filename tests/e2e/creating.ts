/** What the browser tests share: a campaign's creation link, and the steps that make a character from it. */
import { readFileSync } from 'node:fs'
import { type Page, expect } from '@playwright/test'
import type { DataPack } from '../../src/data/types.ts'
import { sampleRules } from '../../src/domain/samples.ts'
import { type DraftChoice, choose, emptyDraft, toCharacter } from '../../src/features/creation/draft.ts'
import { encodeCreationCode } from '../../src/shared/codec/codes.ts'
import type { CharacterDocument } from '../../src/shared/schema/character.ts'
import { openHome } from './home.ts'

// The game data the build made: the link below is written with it, as a game master's app would.
const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack

/** The campaign "Night Shift", whose characters start at level 5. */
export const invitation = { campaign: { id: 'e2eCampaign00001', name: 'Night Shift' }, dataPackVersion: pack.version, rules: { ...sampleRules(pack, 2, 2, 4), startingLevel: 5 } }

/** The creation code of that campaign. */
export const code = encodeCreationCode(invitation, pack.species)

/**
 * A Pikachu of that campaign as the steps of creation would make it, without
 * going through them: for a character that comes from another device.
 */
export function pikachu(nickname: string, id: string): CharacterDocument {
  const context = { pack, rules: invitation.rules }
  const choices: DraftChoice[] = [
    { choose: 'species', species: 'pikachu' },
    { choose: 'nickname', nickname },
    { choose: 'gender', gender: 'F' },
    { choose: 'nature', nature: 'jolly' },
    { choose: 'ability', ability: 'static' },
    // The roleplay points start at 5 and may wait (decisions 302 and 307): none is placed here.
    { choose: 'move', move: 'thundershock' },
    { choose: 'pack', pack: 0 },
  ]
  const character = toCharacter(choices.reduce((draft, choice) => choose(draft, choice, context), emptyDraft), invitation, pack, id)
  if (!character) throw new Error('The steps of creation no longer make this character: update the choices above.')
  return character
}

/** The step of creation the bar across the bottom screen shows as the one being done. */
export async function expectStep(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('navigation', { name: 'Steps of creation' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'step')
}

/** On the identity step: the 265 roleplay points, 45 in strength and 44 in each other attribute, typed in its box. They start at 5 (decisions 302 and 307). */
export async function placeAttributes(page: Page): Promise<void> {
  for (const name of ['Strength', 'Dexterity', 'Endurance', 'Intelligence', 'Perception', 'Charisma']) {
    await page.getByRole('spinbutton', { name: new RegExp(`\\(${name}\\)`) }).fill(name === 'Strength' ? '45' : '44')
  }
  await expect(page.getByRole('status', { name: 'All 265 points are placed.' })).toBeVisible()
}

/**
 * Goes through the steps of creation that come after the campaign's with the
 * fewest choices that make a character, taking the item pack named. What comes
 * over a screen is a dialog; a wheel is a list of options, the one in its
 * middle the one selected.
 */
export async function createPikachu(page: Page, nickname: string, itemPack = 'Sac d’aventurier 1'): Promise<void> {
  const next = page.getByRole('button', { name: 'NEXT', exact: true })
  const tray = page.getByRole('dialog')

  // The Pokémon: found by its name, then gone on with.
  await expectStep(page, 'Pokémon')
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click()
  await tray.getByRole('searchbox').fill('pika')
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('option', { name: 'Pikachu', selected: true })).toBeVisible()
  await next.click()

  // Who it is: its name, its sex, its roleplay attributes.
  await expectStep(page, 'Identity')
  await expect(next).toBeDisabled()
  await page.getByRole('textbox', { name: 'Nickname' }).fill(nickname)
  await page.getByRole('button', { name: 'Female', exact: true }).click()
  await placeAttributes(page)
  await next.click()

  // How it fights: its Ability, the first chosen until another is (decision 304).
  await expectStep(page, 'Combat')
  await page.getByRole('group', { name: 'Ability' }).getByRole('button', { name: 'Static', exact: true }).click()
  await next.click()

  // Its nature, over its TV (decision 306).
  await expectStep(page, 'Training Value')
  await expect(next).toBeDisabled()
  await page.getByRole('group', { name: 'Raises' }).getByRole('button', { name: 'SPE (Speed)', exact: true }).click()
  await page.getByRole('group', { name: 'Lowers' }).getByRole('button', { name: 'SPA (Special Attack)', exact: true }).click()
  // The nature is said for whoever does not see the top screen, where it is written (decision 303).
  await expect(page.getByRole('status').filter({ hasText: 'Jolly: raises Speed, lowers Special Attack' })).toBeAttached()
  await next.click()

  // Its moves: the first place, filled from the list by typing the move's name on the wheel.
  await expectStep(page, 'Moves')
  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: 'Move 1: empty' }).click()
  await tray.getByRole('listbox', { name: 'Moves' }).focus()
  await page.keyboard.type('thunder s')
  await expect(tray.getByRole('option', { name: 'Thunder Shock', selected: true })).toBeVisible()
  await tray.getByRole('button', { name: 'OK', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Move 1: Thunder Shock' })).toBeVisible()
  await next.click()

  // Its pack: brought to the middle of its wheel by typing its name there, then taken.
  await expectStep(page, 'Item pack')
  await expect(next).toBeDisabled()
  await page.getByRole('listbox', { name: 'Item packs' }).focus()
  await page.keyboard.type(itemPack)
  await expect(page.getByRole('option', { name: itemPack, exact: true, selected: true })).toBeVisible()
  await page.getByRole('button', { name: 'SELECT', exact: true }).click()
  await next.click()

  await expectStep(page, 'A last look')
  await page.getByRole('button', { name: 'CREATE', exact: true }).click()
}

/** From the home, sets a campaign with the fewest choices that let it be saved, and saves it. */
export async function setCampaign(page: Page, name: string): Promise<void> {
  await openHome(page)
  await page.getByRole('button', { name: /CAMPAIGNS/ }).click()
  await page.getByRole('button', { name: 'NEW' }).click()
  await saveNewCampaign(page, name)
  // A saved campaign has an address of its own.
  await expect(page).toHaveURL(/\/campaigns\/[A-Za-z0-9_-]{16}$/)
  await expect(page.getByText('Creation link · Rules version 1')).toBeVisible()
}

/** On a new campaign's page: names it, sets the fewest rules that let it be saved (a pack named Field kit among them), and saves it. */
export async function saveNewCampaign(page: Page, name: string): Promise<void> {
  const done = page.getByRole('button', { name: 'DONE' })
  const save = page.getByRole('button', { name: 'SAVE THE RULES' })
  // Natures and moves have no default, and a pack is needed: nothing can be saved yet.
  await expect(save).toBeDisabled()

  await page.getByRole('button', { name: /^Name/ }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(name)
  await done.click()
  await page.getByRole('button', { name: /^Natures/ }).click()
  await page.getByRole('button', { name: /^Each player chooses/ }).click()
  await done.click()
  await page.getByRole('button', { name: /^Moves/ }).click()
  await page.getByRole('button', { name: /^Level-up only/ }).click()
  await done.click()
  await page.getByRole('button', { name: /^Item packs/ }).click()
  await page.getByRole('button', { name: 'ADD A PACK' }).click()
  await page.getByRole('textbox', { name: 'Name of the pack' }).fill('Field kit')
  await page.getByRole('searchbox', { name: 'Add an item' }).fill('potion')
  await page.getByRole('button', { name: /^Potion/ }).click()
  await done.click()

  await save.click()
}

/**
 * On the page of a new encounter: names it and gives it one enemy, a Pikachu,
 * with the fewest choices that let the encounter be saved. Ends on that
 * enemy's page, nothing saved yet.
 */
export async function draftEncounter(page: Page, name: string): Promise<void> {
  const done = page.getByRole('button', { name: 'DONE' })
  await page.getByRole('button', { name: /^Name/ }).click()
  await page.getByRole('textbox', { name: 'Name' }).fill(name)
  await done.click()

  await page.getByRole('button', { name: 'ADD AN ENEMY' }).click()
  // Its Pokémon comes first: the rest opens once it is chosen.
  await expect(page.getByRole('button', { name: /^Moves/ })).toBeHidden()
  await page.getByRole('button', { name: /^Pokémon/ }).click()
  await page.getByRole('searchbox').fill('pika')
  await page.getByRole('button', { name: /Pikachu/ }).click()
  await done.click()
  await page.getByRole('button', { name: /^Name, gender/ }).click()
  await page.getByRole('button', { name: /^Female/ }).click()
  await page.getByRole('button', { name: /^Jolly/ }).click()
  await page.getByRole('button', { name: /^Static/ }).click()
  await done.click()
  await page.getByRole('button', { name: /^Moves/ }).click()
  await page.getByRole('button', { name: /^Thunder Shock/ }).click()
  await done.click()
}
