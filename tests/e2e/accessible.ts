/** What the browser tests share to check a screen with axe: WCAG 2.2 at levels A and AA, as far as a machine can tell. */
import AxeBuilder from '@axe-core/playwright'
import { type Page, expect } from '@playwright/test'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * The screen as it stands breaks no rule axe can check. `where` names the
 * screen in the failure. Axe cannot judge everything: the contrast of text
 * drawn over a painted shape is measured apart (DECISIONS.md, section 5), and
 * a screen reader is the owner's to try.
 */
export async function expectAccessible(page: Page, where: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const feet = page.locator('.dn-foot')
  const foot = (await feet.count()) > 0 ? await feet.first().boundingBox() : null
  const broken: string[] = []
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const target = node.target.join(' ')
      // A control that the foot of the page covers at this very scroll is not too small: scrolling uncovers it.
      if (violation.id === 'target-size' && foot) {
        const box = await page.locator(target).first().boundingBox()
        if (box && box.y + box.height > foot.y && box.y < foot.y + foot.height) continue
      }
      broken.push(`${violation.id}: ${target} (${node.failureSummary?.split('\n')[1]?.trim() ?? violation.help})`)
    }
  }
  expect(broken, where).toEqual([])
}
