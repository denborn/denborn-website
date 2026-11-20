/**
 * A new campaign made from character creation (decision 299). Its page is
 * opened with these words in its address; once the campaign is saved, the
 * player is taken back to creation, on that campaign, rather than to the
 * campaign's own page.
 */
const FOR_CHARACTER = { for: 'character' } as const

/** Where creation sends the player to make a new campaign. */
export const NEW_CAMPAIGN_FOR_CHARACTER = `/campaigns/new?${new URLSearchParams(FOR_CHARACTER).toString()}`

/** Whether a page's address says it makes a new campaign for a character. */
export const isForCharacter = (search: URLSearchParams): boolean => search.get('for') === FOR_CHARACTER.for

/** The words of the address, with what the page itself keeps there: they go along while its rules are opened and closed. */
export const withForCharacter = (forCharacter: boolean, own: Record<string, string>): Record<string, string> => (forCharacter ? { ...FOR_CHARACTER, ...own } : own)
