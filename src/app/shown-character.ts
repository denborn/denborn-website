/**
 * The character the list shows large (decision 241), for the rest of the
 * visit: back on the list from its sheet, or from one just made or taken in,
 * the same one is shown. Not kept past the visit: the list then opens on the
 * first.
 */
import { create } from 'zustand'

interface ShownCharacter {
  /** The id it is kept under, once one was shown or opened. */
  id: string | undefined
  show: (id: string) => void
}

export const useShownCharacter = create<ShownCharacter>((set) => ({
  id: undefined,
  show: (id) => set({ id }),
}))
