/** A text as a search compares it: without accents or capitals, so that "Mélofée" is found by "melo". */
export function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Whether a name answers a search. An empty search is answered by every name. */
export function answers(name: string, search: string): boolean {
  return plain(name).includes(plain(search.trim()))
}
