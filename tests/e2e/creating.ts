/** What the browser tests share: a campaign's creation link, and the steps that make a character from it. */
import { readFileSync } from 'node:fs'
import { type Page, expect } from '@playwright/test'
import type { DataPack } from '../../src/data/types.ts'
import { sampleRules } from '../../src/domain/samples.ts'
import { encodeCreationCode } from '../../src/shared/codec/codes.ts'

// The game data the build made: the link below is written with it, as a game master's app would.
const pack = JSON.parse(readFileSync(new URL('../../src/data/generated/pack.json', import.meta.url), 'utf8')) as DataPack
const invitation = { campaign: { id: 'e2eCampaign00001', name: 'Night Shift' }, dataPackVersion: pack.version, rules: { ...sampleRules(pack, 2, 2, 4), startingLevel: 5 } }

/** The creation code of the campaign "Night Shift", whose characters start at level 5. */
export const code = encodeCreationCode(invitation, pack.species)

/** Goes through the seven steps with the fewest choices that make a character. */
export async function createPikachu(page: Page, nickname: string): Promise<void> {
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
  await page.getByRole('button', { name: /^Sac d’aventurier 1/ }).click()
  await next.click()

  await expect(page.getByRole('heading', { name: 'A last look' })).toBeVisible()
  await page.getByRole('button', { name: 'CREATE' }).click()
}
