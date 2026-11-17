/**
 * Whether the title screen moves (decision 206): its rain and its lightning
 * go on beside the home's menu for as long as the home shows, so the Options
 * can hold them still. The den on the top screen of other pages (decision 217)
 * follows the same choice. A choice of the device, kept like the language.
 */
import { useSyncExternalStore } from 'react'
import { createDeviceChoice } from '../../storage/device-choice'

export const TITLE_ANIMATIONS = ['on', 'off'] as const
export type TitleAnimation = (typeof TITLE_ANIMATIONS)[number]

/** A stored choice wins; otherwise on. */
export function pickTitleAnimation(stored: string | null): TitleAnimation {
  return TITLE_ANIMATIONS.find((animation) => animation === stored) ?? 'on'
}

const choice = createDeviceChoice('denborn/title-animation', pickTitleAnimation)

export function setTitleAnimation(animation: TitleAnimation): void {
  choice.set(animation)
}

export function useTitleAnimation(): TitleAnimation {
  return useSyncExternalStore(choice.subscribe, choice.get)
}
