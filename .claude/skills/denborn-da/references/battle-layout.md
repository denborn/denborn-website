# Battle layout

## The games (DS, two screens of 256 × 192)

**Top screen**: the scene. The foe stands upper right on its base, seen from the front; the player's Pokémon lower left, seen from behind and cut by the bottom edge. The foe's HP box is upper left, the player's lower right. A band 45 px tall across the bottom carries the message, over the darkened scene.

**Touch screen**: the great ball in the middle is FIGHT. BAG, RUN and POKéMON are three tiles along the bottom edge (RUN, in the middle, is shorter). FIGHT opens the moves: rounded buttons in the move's type colour, with type, and PP.

In triple battles the HP boxes stack: three upper left for the foes, three lower right for the player's side.

## Denborn on a phone (portrait)

Two `Screen`s stacked, each the full width: `scene` above, `touch` below. The same diagonal as the games: foes upper right, the party lower left, foe boxes stacked upper left, party boxes stacked lower right above the message band.

Measures used by the three-against-three board (`src/ui/stories/Scene.stories.tsx`), in DS pixels:

| Piece | Place |
|---|---|
| Foe sprites | scale 0.55; feet at y = 71; centres at x = 140, 186, 232 |
| Party sprites | scale 0.66; feet at y = 152 (under the band's top edge); centres at x = 26, 74, 122 |
| HP boxes | 104 wide (`--dn-hud-width`), about 20 tall, 3 apart; foes from (2, 3); party ending 49 above the bottom, 2 from the right |
| Message band | bottom 46 |
| Horizon of the backdrop | y = 58 (30%) |

Touch screen: ball 156 across, 4 from the top; tiles 82 × 46 (RUN 82 × 38) along the bottom; six moves two by three with a last row for BACK.

## Not designed yet

Four to six Pokémon a side (boxes this size do not fit: the design comes with the battle screens), target selection, the Bag in battle, the party's hypothetical order, the timer, the GM's console. Ask the owner; do not improvise them from this file.
