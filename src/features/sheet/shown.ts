/** What both forms of a sheet, on screen and on paper, are drawn from, and the few things they say alike. */
import type { DataPack } from '../../data/types.ts'
import type { SheetNumbers } from '../../domain/sheet.ts'
import type { Language } from '../../i18n/index.ts'
import type { Messages } from '../../i18n/en.ts'
import { encodeCharacterCode, qrForm } from '../../shared/codec/codes.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'

export interface SheetView {
  pack: DataPack
  character: CharacterDocument
  /** Its stats and the other numbers worked out from it. */
  numbers: SheetNumbers
  language: Language
  messages: Messages
}

/** A type's name in the app's language; the data pack's own word when it has no such type. */
export function typeName(pack: DataPack, type: string, language: Language): string {
  return pack.types[type.toLowerCase()]?.name[language] ?? type
}

/** The link a character's QR code holds: the app's address with the whole character after the "#". */
export function characterLink(character: CharacterDocument, origin: string): string {
  return qrForm(encodeCharacterCode(character), origin)
}
