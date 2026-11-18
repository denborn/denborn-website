/**
 * The pictures a fight can be given for a background (decisions 246 and
 * 268): fifteen of Pokémon Showdown's battle backdrops, drawn by Kyle Dove,
 * the ones the title's plain and the den's inside already come from. They are
 * fetched when the app is built (`scripts/assets/sync-sprites.ts`), checked
 * against `data-sources/backdrops.lock.json`, and never committed.
 *
 * Each is pixel art served enlarged by a little over three: `served` is the
 * size of its file, `own` its size in its own pixels. In its own pixels a
 * picture is drawn at the scale of a DS screen.
 *
 * Every picture has two battle bases painted in it, lighter grounds its two
 * Pokémon stand on: a far one, upper right, and a near one, lower left, cut
 * by the picture's left side. `bases` is the middle of each, in the
 * picture's own pixels. The fifteen are one drawing of the ground under
 * fifteen places. The far base is whole: 122 by 28 from (112, 60), as large
 * as Black and White's far base is on the games' screen. The near base is 54
 * tall from row 97 and ends at column 160, but it is an ellipse about 200
 * wide, of which the picture has the right three quarters: its middle is
 * where an ellipse fitted to its right edge has it, 57.5 across (57 to 58 on
 * the pictures it shows clearly on), and not in the middle of what is drawn.
 * The beach has bases of its own, a little narrower. Showdown's own client
 * does not stand its Pokémon on the middle of them: the app does (decisions
 * 283 and 284, `src/ui/scene-camera.ts`).
 *
 * This file imports nothing, so that the build script can read it too.
 */

/** A size, in pixels. */
interface Size {
  width: number
  height: number
}

/** A point of a picture, in its own pixels from its top left corner. */
interface Point {
  x: number
  y: number
}

/** The middle of each of the two battle bases painted in a picture. */
export interface BackdropBases {
  far: Point
  near: Point
}

/** What every picture but the beach is: its size as it is served and in its own pixels, and its two bases. */
const FULL = {
  served: { width: 753, height: 500 },
  own: { width: 238, height: 158 },
  bases: { far: { x: 172.5, y: 73.5 }, near: { x: 57.5, y: 123.5 } },
} as const

/** The beach: a narrower picture, with its bases a little further left. */
const BEACH = {
  served: { width: 700, height: 500 },
  own: { width: 221, height: 158 },
  bases: { far: { x: 160.5, y: 73.5 }, near: { x: 56.5, y: 123.5 } },
} as const

/** Where the pictures are served from, under `public/sprites/`, once fetched. */
export const BACKDROP_FOLDER = 'fx'

export interface BattleBackdrop {
  /** The name an encounter keeps it by. */
  id: string
  /** Its file, as Showdown names it. */
  file: string
  /** The size of its file. */
  served: Size
  /** Its size in its own pixels. */
  own: Size
  /** The middle of its two battle bases, in its own pixels. */
  bases: BackdropBases
}

const picture = (id: string, file: string, shape: Pick<BattleBackdrop, 'served' | 'own' | 'bases'> = FULL): BattleBackdrop => ({ id, file: `bg-${file}.png`, ...shape })

/** Every background, in the order they are offered: the owner's own list (decision 268). */
export const BATTLE_BACKDROPS: readonly BattleBackdrop[] = [
  picture('forest', 'forest'),
  picture('earthy-cave', 'earthycave'),
  picture('desert', 'desert'),
  picture('deep-sea', 'deepsea'),
  picture('damp-cave', 'dampcave'),
  picture('city', 'city'),
  picture('beach', 'beach', BEACH),
  picture('beach-shore', 'beachshore'),
  picture('meadow', 'meadow'),
  picture('ice-cave', 'icecave'),
  picture('mountain', 'mountain'),
  picture('volcano-cave', 'volcanocave'),
  picture('thunder-plains', 'thunderplains'),
  picture('route', 'route'),
  picture('river', 'river'),
]

/** The background a fight has when its encounter names none, or one this app does not have: the meadow. */
export const DEFAULT_BACKDROP = 'meadow'

export function backdropOf(id: string | undefined): BattleBackdrop | undefined {
  return BATTLE_BACKDROPS.find((backdrop) => backdrop.id === id)
}

/** Every file the app shows for a fight's background: what the build fetches. */
export function backdropFiles(): string[] {
  return BATTLE_BACKDROPS.map((backdrop) => backdrop.file)
}
