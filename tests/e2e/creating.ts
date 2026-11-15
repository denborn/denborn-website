/** What the browser tests share: a campaign's creation link, and the steps that make a character from it. */
import { readFileSync } from 'node:fs'
import { type Page, expect } from '@playwright/test'
import type { DataPack } from '../../src/data/types.ts'
import { sampleRules } from '../../src/domain/samples.ts'
import { type DraftChoice, choose, emptyDraft, toCharacter } from '../../src/features/creation/draft.ts'
import { encodeCreationCode } from '../../src/shared/codec/codes.ts'
import type { CharacterDocument } from '../../src/shared/schema/character.ts'

// The game data the build made: the link below is written with it, as a game master's app would.
const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack

/** The campaign "Night Shift", whose characters start at level 5. */
export const invitation = { campaign: { id: 'e2eCampaign00001', name: 'Night Shift' }, dataPackVersion: pack.version, rules: { ...sampleRules(pack, 2, 2, 4), startingLevel: 5 } }

/** The creation code of that campaign. */
export const code = encodeCreationCode(invitation, pack.species)

/**
 * A Pikachu of that campaign as the seven steps would make it, without going
 * through them: for a character that comes from another device.
 */
export function pikachu(nickname: string, id: string): CharacterDocument {
  const context = { pack, rules: invitation.rules }
  const choices: DraftChoice[] = [
    { choose: 'species', species: 'pikachu' },
    { choose: 'nickname', nickname },
    { choose: 'gender', gender: 'F' },
    { choose: 'nature', nature: 'jolly' },
    { choose: 'ability', ability: 'static' },
    { choose: 'move', move: 'thundershock' },
    { choose: 'pack', pack: 0 },
  ]
  const character = toCharacter(choices.reduce((draft, choice) => choose(draft, choice, context), emptyDraft), invitation, pack, id)
  if (!character) throw new Error('The steps of creation no longer make this character: update the choices above.')
  return character
}

/** Goes through the seven steps with the fewest choices that make a character, taking the item pack named. */
export async function createPikachu(page: Page, nickname: string, itemPack = 'Sac d’aventurier 1'): Promise<void> {
  const next = page.getByRole('button', { name: 'NEXT', exact: true })
  await expect(page.getByRole('heading', { name: 'Choose a Pokémon' })).toBeVisible()
  await expect(next).toBeDisabled()
  await page.getByRole('searchbox').fill('pika')
  await page.getByRole('button', { name: /Pikachu/ }).click()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('textbox', { name: 'Nickname' }).fill(nickname)
  await page.getByRole('button', { name: /^Female/ }).click()
  await page.getByRole('button', { name: /^Jolly/ }).click()
  await page.getByRole('button', { name: /^Static/ }).click()
  await next.click()

  await expect(page.getByRole('heading', { name: 'Roleplay attributes' })).toBeVisible()
  await next.click()
  await expect(page.getByRole('heading', { name: 'IVs and EVs' })).toBeVisible()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: /^Thunder Shock/ }).click()
  await next.click()

  await expect(next).toBeDisabled()
  await page.getByRole('button', { name: new RegExp(`^${itemPack}`) }).click()
  await next.click()

  await expect(page.getByRole('heading', { name: 'A last look' })).toBeVisible()
  await page.getByRole('button', { name: 'CREATE' }).click()
}

/** From the home, sets a campaign with the fewest choices that let it be saved, and saves it. */
export async function setCampaign(page: Page, name: string): Promise<void> {
  const done = page.getByRole('button', { name: 'DONE' })
  const save = page.getByRole('button', { name: 'SAVE THE RULES' })
  await page.goto('/')
  await page.getByRole('button', { name: /CAMPAIGNS/ }).click()
  await page.getByRole('button', { name: 'NEW' }).click()
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
  // A saved campaign has an address of its own.
  await expect(page).toHaveURL(/\/campaigns\/[A-Za-z0-9_-]{16}$/)
  await expect(page.getByText('Creation link · Rules version 1')).toBeVisible()
}
