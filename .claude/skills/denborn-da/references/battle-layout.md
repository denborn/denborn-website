# Battle layout

## The games (DS, two screens of 256 × 192)

**Top screen**: the scene. The foe stands upper right on its base, seen from the front; the player's Pokémon lower left, seen from behind and cut by the bottom edge. The foe's HP box is upper left, the player's lower right. A band 45 px tall across the bottom carries the message, over the darkened scene.

**Touch screen**: the great ball in the middle is FIGHT. BAG, RUN and POKéMON are three tiles along the bottom edge (RUN, in the middle, is shorter). FIGHT opens the moves: rounded buttons in the move's type colour, with the type's label and the PP.

In triple battles the HP boxes stack: three upper left for the foes, three lower right for the player's side.

## Denborn on a phone (portrait)

Two `Screen`s stacked, each the full width: `scene` above, `touch` below. A session has four players or more, so the scene shows **one foe and one ally at a time**, as the games' one-against-one battles do, and the player walks along each line with arrows (decision 87). An earlier board that drew three Pokémon a side at once was dropped for that reason.

Measures of the board (`src/ui/stories/Scene.stories.tsx`), in DS pixels:

| Piece | Place |
|---|---|
| Foe sprite | scale 0.9; feet at y = 88; centre at x = 208 |
| Ally sprite, seen from behind | scale 1.1; feet at y = 152 (under the band's top edge); centre at x = 52 |
| Foe line browser | top left, 2 from the top: arrow, HUD box 104 wide, arrow, the line's letters under the box |
| Ally line browser | bottom right, 48 above the bottom |
| Message band | bottom 46 |
| Horizon of the backdrop | y = 58 (30%) |

Touch screen, commands: ball 156 across, 4 from the top; tiles 82 × 46 (RUN 82 × 38) along the bottom; the BATTLEFIELD corner tile 62 × 34 top right, clear of the ball, its label at size 8 (one line in English, two in French). Moves: six, two by three, with a last row for BACK.

Touch screen, battlefield plan: the foes' line above the party's; between them the terrain and the weather, by name only, each a `TypeLabel` (the terrain in its own type: Electric, Grass, Fairy for Misty, Psychic; the weather in Water for rain, Fire for sun, Rock for a sandstorm, Ice for snow); at the foot MORE with the number of effects, and BACK; tiles 40 × 54 at a pitch of 42, so six fill the 256 of the width; each line centred. With lines of different lengths the tiles are offset by half a pitch, which is exactly the rules' geometry: a foe is in reach when its tile overlaps or touches the column of yours.

Touch screen, effects (behind MORE): a scrolling list, one dithered panel per effect: mark, name, turns left in gold, scope, description. The mark is a diamond for the whole field, an arrow up for the foes' side, an arrow down for the party's: the sides as they lie on the plan. An effect on a single Pokémon adds that Pokémon's letter after the arrow. Order: the field, the two sides, then each Pokémon, foes first.

A Pokémon that carries stat changes or effects of its own has a gold mark (an arrow up over an arrow down, 7 × 9) at the top right of its tile and beside the badges of its HUD box.

An arrow or a tile is never under 44 px: on a 393 px phone an arrow takes 29 DS pixels of width, so arrow + box + arrow is 162 wide.

## Not designed yet

Target selection, the Bag in battle, the party's hypothetical order, the timer, the GM's console. Ask the owner; do not improvise them from this file.
