/**
 * How a screen of the frame goes and the next one comes (decisions 218 and
 * 219). Nothing fades: things move, as in the games.
 *
 * Where the backdrop stays the same, the pieces fly. A screen's title goes up
 * over the top edge; each row goes out by the side the person is heading
 * away from, and each button by the side it is nearest to. The next screen's
 * pieces come in the same way, one after the other from the top down. This is
 * the games' battle menu, where the commands fly out and the moves fly in.
 *
 * Where the backdrop itself changes, black stripes sweep in from both sides,
 * close over the screen, and sweep on off the next one: the stripes before a
 * fight.
 *
 * Into the Pokédex and out of it (decision 287), the Pokédex itself comes in
 * the stripes' place. Shut, it rises onto the bottom screen; its lid rises
 * onto the top one; then its two shutters part on both, and the Pokédex is
 * open. Going out, the shutters close and the Pokédex goes back down.
 *
 * Denborn's own timings; only `translate` moves, so that a piece's own
 * transform, if it has one, is left alone.
 */
import { animate } from 'motion/mini'
import { DURATION, EASE, SCREEN } from './motion'

/** How a screen is left for the next. */
export interface Passage {
  /** 1: further in. Rows leave by the left and come from the right. -1: back out, the other way round. */
  direction: 1 | -1
  /** The backdrop changes: the stripes, in place of the pieces. */
  wipe: boolean
  /** The backdrop changes to the Pokédex's, or from it: the Pokédex opens, or shuts, in place of the stripes. */
  dex?: 'open' | 'shut'
}

/** Which of the two screens a layer is on: the Pokédex comes onto the bottom one first. */
export type ScreenPlace = 'top' | 'bottom'

/** The same change of screen the other way round: what a screen called back before it was out comes in by. */
export function reversed(passage: Passage): Passage {
  const back: Passage = { direction: passage.direction === 1 ? -1 : 1, wipe: passage.wipe }
  if (passage.dex) back.dex = passage.dex === 'open' ? 'shut' : 'open'
  return back
}

/** A box on the page, as the browser measures it. */
export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

/**
 * What moves piece by piece, in the kit's own layouts: a page's title, its
 * tabs, its rows and its foot's buttons; the main menu's buttons and its
 * notice; the battle's commands, moves, lists and plan. A screen with none of
 * these moves the things it holds whole. The strip across a fight's touch
 * screen is no piece: it is the same on the screen that goes and on the one
 * that comes, and stays where it is.
 *
 * A piece that goes out by a side must not be a child of something that
 * scrolls: out by the right, it would make that thing scroll sideways to it
 * when the browser is asked to bring it into view (a press on it, the focus),
 * and nothing would scroll it back. So a page's rows, tabs and foot buttons
 * are children of boxes that cut off what is beside them (`overflow-x: clip`
 * in kit.css), and a list that scrolls inside a screen moves whole.
 */
const PIECES = [
  '.dn-step',
  '.dn-tabs > *',
  '.dn-stack > *',
  '.dn-menu__grid > *',
  '.dn-menu__notice',
  '.dn-lineup > *',
  '.dn-commands > :not(.dn-topstrip)',
  '.dn-moves__grid > *',
  '.dn-moves__foot',
  '.dn-moves > .dn-command',
  '.dn-roster__title',
  '.dn-roster__list',
  '.dn-ask > *',
  '.dn-field__line',
  '.dn-field__ground',
  '.dn-effects__list',
  '.dn-effects__empty',
  '.dn-card > *',
  '.dn-carousel > .dn-note',
  '.dn-carousel__side > *',
  '.dn-carousel__sides > .dn-showcase',
  '.dn-carousel > .dn-strip-frame',
  '.dn-scene__box',
  '.dn-scene__message',
  '.dn-foot > *',
  '.dn-dex-body > *',
  '.dn-dex-foot > *',
  '.dn-tray',
  '.dn-roster__foot > *',
  '.dn-field__foot > *',
  '.dn-effects__back',
].join(', ')

/** A piece that goes up over the top edge, not out by a side. */
const TITLE = '.dn-step'

/** A piece at least this much of the screen's width is a row: it goes by the passage's side, not by its nearest one. */
const ROW = 0.6

/** No more pieces than this move one after the other: a screen shows no more at once, and the wait would be long. The game master's commands are the most: the strip, three tiles above, the two orders around FIGHT, three tiles below. */
const MOST = 12

/**
 * How far from its place a piece is while it is out of the screen, in pixels
 * across and down. `side` is the side a row is out by: 1 the right, -1 the
 * left. A title is out over the top; a button, or anything narrower than a
 * row, is out by the side it is nearest to.
 */
export function awayOf(piece: Box, screen: Box, side: 1 | -1, title: boolean): { x: number; y: number } {
  if (title) return { x: 0, y: screen.top - piece.bottom }
  const middle = (piece.left + piece.right) / 2 - (screen.left + screen.right) / 2
  const row = piece.right - piece.left >= ROW * (screen.right - screen.left)
  const by = row || middle === 0 ? side : middle > 0 ? 1 : -1
  return { x: by === 1 ? screen.right - piece.left : screen.left - piece.right, y: 0 }
}

/** Whether any of a piece shows inside the screen. */
export function showsIn(piece: Box, screen: Box): boolean {
  return piece.right > piece.left && piece.bottom > piece.top && piece.bottom > screen.top && piece.top < screen.bottom && piece.right > screen.left && piece.left < screen.right
}

function piecesOf(layer: HTMLElement, screen: Box): HTMLElement[] {
  const listed = [...layer.querySelectorAll<HTMLElement>(PIECES)].filter((piece) => !piece.parentElement?.closest(PIECES))
  const whole = [...(layer.querySelector('.dn-screen__stage')?.children ?? [])].filter((held) => held instanceof HTMLElement)
  return (listed.length > 0 ? listed : whole).filter((piece) => showsIn(piece.getBoundingClientRect(), screen)).slice(0, MOST)
}

/** Waits for moves to end, however they end, and no longer than they should take: a move cut short must not hold a screen back. */
async function ended(moves: readonly Promise<unknown>[], seconds: number): Promise<void> {
  await Promise.race([Promise.allSettled(moves), new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100))])
}

async function fly(layer: HTMLElement, side: 1 | -1, coming: boolean): Promise<void> {
  // A blank screen has nothing to bring in: what it holds takes a press from the first moment (TOUCH TO START).
  if (coming && layer.querySelector('.dn-screen--blank')) return
  const screen = layer.getBoundingClientRect()
  const pieces = piecesOf(layer, screen)
  const length = coming ? DURATION.move : DURATION.quick
  const gap = coming ? SCREEN.piece : SCREEN.pieceOut
  const moves = pieces.map((piece, index) => {
    const away = awayOf(piece.getBoundingClientRect(), screen, side, piece.matches(TITLE))
    const out = `${away.x}px ${away.y}px`
    return animate(piece, { translate: coming ? [out, '0px 0px'] : ['0px 0px', out] }, { duration: length, delay: index * gap, ease: coming ? EASE.out : EASE.in }).finished
  })
  await ended(moves, length + pieces.length * gap)
  if (!coming) return
  // A piece that has come is left as its own style has it. One that has gone stays out until its screen is taken away.
  for (const piece of pieces) piece.style.removeProperty('translate')
}

/** The stripes: the odd ones come from the left and go on to the right, the even ones the other way. */
async function sweep(layer: HTMLElement, closing: boolean): Promise<void> {
  const stripes = [...layer.querySelectorAll<HTMLElement>('.dn-dual__stripe')]
  const moves = stripes.map((stripe, index) => {
    const from = index % 2 === 0 ? -1 : 1
    const path = closing ? [`${from * 101}% 0px`, '0% 0px'] : ['0% 0px', `${-from * 101}% 0px`]
    return animate(stripe, { translate: path }, { duration: DURATION.quick, delay: index * SCREEN.stripe, ease: closing ? EASE.out : EASE.in }).finished
  })
  await ended(moves, DURATION.quick + stripes.length * SCREEN.stripe)
  // Once open, a stripe is out of the screen again, where its own style keeps it.
  if (!closing) for (const stripe of stripes) stripe.style.removeProperty('translate')
}

/** The Pokédex over a layer: the box that rises and goes down, and its two shutters. */
function dexOf(layer: HTMLElement): { box: HTMLElement; shutters: HTMLElement[] } | undefined {
  const box = layer.querySelector<HTMLElement>('.dn-dual__dex')
  return box ? { box, shutters: [...box.querySelectorAll<HTMLElement>('.dn-dual__shutter')] } : undefined
}

const SHUT = '0% 0%'
/** Out of the screen, under its bottom edge: where the Pokédex comes from and goes back to. */
const UNDER = '0% 101%'

/** The shutters, both at once: the left one out by the left and the right one by the right, or back. */
function shutters(parts: readonly HTMLElement[], parting: boolean, delay: number): Promise<unknown>[] {
  return parts.map((part, index) => {
    const away = `${index === 0 ? -101 : 101}% 0%`
    return animate(part, { translate: parting ? [SHUT, away] : [away, SHUT] }, { duration: DURATION.quick, delay, ease: parting ? EASE.in : EASE.out }).finished
  })
}

/**
 * The screen that goes out as the Pokédex opens, or as it shuts. Opening: the
 * Pokédex, shut, rises over it; over the top screen it is the lid, which
 * rises once the Pokédex is up on the bottom one. Shutting: its shutters
 * close over it.
 */
async function dexCovers(layer: HTMLElement, dex: 'open' | 'shut', place: ScreenPlace): Promise<void> {
  const pokedex = dexOf(layer)
  if (!pokedex) return
  if (dex === 'open') {
    const wait = place === 'top' ? DURATION.move : 0
    const length = place === 'top' ? DURATION.quick : DURATION.move
    await ended([animate(pokedex.box, { translate: [UNDER, SHUT] }, { duration: length, delay: wait, ease: EASE.out }).finished], wait + length)
    return
  }
  pokedex.box.style.translate = SHUT
  await ended(shutters(pokedex.shutters, false, 0), DURATION.quick)
}

/**
 * The screen that comes as the Pokédex opens, or as it shuts. Opening: it is
 * behind the shutters, which part on both screens at the same moment; the
 * bottom one waits for the lid to be up. Shutting: the Pokédex, shut over it,
 * goes back down. Then the Pokédex is put back out of sight, where its own
 * style keeps it.
 */
async function dexUncovers(layer: HTMLElement, dex: 'open' | 'shut', place: ScreenPlace): Promise<void> {
  const pokedex = dexOf(layer)
  if (!pokedex) return
  pokedex.box.style.translate = SHUT
  if (dex === 'open') {
    const wait = place === 'bottom' ? DURATION.quick : 0
    await ended(shutters(pokedex.shutters, true, wait), wait + DURATION.quick)
  } else {
    const length = place === 'bottom' ? DURATION.move : DURATION.quick
    await ended([animate(pokedex.box, { translate: [SHUT, UNDER] }, { duration: length, ease: EASE.in }).finished], length)
  }
  pokedex.box.style.removeProperty('translate')
  for (const shutter of pokedex.shutters) shutter.style.removeProperty('translate')
}

/** Marks a screen as moving for as long as `move` lasts: a test waits for it before it judges the screen. */
async function moving(layer: HTMLElement, move: Promise<void>): Promise<void> {
  layer.dataset.moving = ''
  try {
    await move
  } finally {
    delete layer.dataset.moving
  }
}

/** A screen comes in. Call it before the screen is first painted. */
export function arrive(layer: HTMLElement, passage: Passage, place: ScreenPlace): Promise<void> {
  if (passage.dex) return moving(layer, dexUncovers(layer, passage.dex, place))
  return moving(layer, passage.wipe ? sweep(layer, false) : fly(layer, passage.direction, true))
}

/** A screen goes out. It resolves when nothing of it shows any more. */
export function leave(layer: HTMLElement, passage: Passage, place: ScreenPlace): Promise<void> {
  if (passage.dex) return moving(layer, dexCovers(layer, passage.dex, place))
  return moving(layer, passage.wipe ? sweep(layer, true) : fly(layer, passage.direction === 1 ? -1 : 1, false))
}
