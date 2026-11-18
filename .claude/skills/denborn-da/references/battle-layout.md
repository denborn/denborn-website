# Battle layout

## The games (DS, two screens of 256 × 192)

**Top screen**: the scene. The foe stands upper right on its base, seen from the front; the player's Pokémon lower left, seen from behind and cut by the bottom edge. The foe's HP box is upper left, the player's lower right. A band 45 px tall across the bottom carries the message, over the darkened scene.

Measured on the owner's screenshots of Black and White at the DS's own size (2026-11-18), against the games' own pictures of the Pokémon on them (96 by 96 each). The scene is in three dimensions under a camera that moves: from one screenshot to the next the Pokémon and the bases are elsewhere, and the plates are not.

| Piece | On the games' screen |
|---|---|
| Far plate | against the left edge, 0 to 123 across; its name on rows 31 to 39, its band on rows 40 to 47 |
| Near plate | against the right edge, 137 to 255 across; its name on rows 111 to 119, its band on rows 120 to 133; the EXP bar on rows 135 to 137 |
| Message band | rows 147 to 191, a line over it on row 146 |
| Far Pokémon | a pixel of the screen to a pixel of its picture (Zorua, Oshawott, Excadrill); its feet on row 96 on one screenshot and 76 on another |
| Far base | 127 wide and 27 tall, its middle at (186.5, 91.5) or at (193, 74.5) |
| Near Pokémon | one and a half times its picture while a round is told (Zoroark, 107 wide for 74), its picture's middle at (64, 129); twice its picture while a command is chosen, the camera closer (Snivy, 79 wide for 40), its middle at (83, 132). Its upper half shows over the message band |
| The pictures | a Pokémon is drawn about the middle of its 96 by 96 picture, up and down, on both sides |

**Touch screen**: the ball is drawn so large that the screen shows only its middle: the red half above, the white half below, and between them a brown belt, wide in its middle, in which FIGHT is written. BAG, RUN and POKéMON are three tiles along the bottom edge (RUN, in the middle, is shorter). FIGHT opens the ball: the red half goes up under the strip, the white one down, and the moves stand in the belt, with the way back on the right tile.

In triple battles the HP boxes stack: three upper left for the foes, three lower right for the player's side. In rotation battles three Pokémon a side stand on a disc that turns: the one that fights at the front, the two others behind it, darker.

## Denborn's fight (decisions 245 to 252, 255, 256 and 259 to 285)

Two `Screen`s in a `DualScreen`, each the full width: `scene` above, `touch` below. The same two screens serve every player and the game master (`src/features/battle/Battle.tsx`); the game master's are mirrored, the enemies in the foreground.

The scene shows **one Pokémon of each line**, each standing on the **battle base painted for it** in the background, the middle of its feet on the middle of the base (decision 283), and as large as on **Black and White's** screen (decision 277). The middle of its feet is read on its picture (`Battler`, with `footprint.ts`, as the list of characters does: decisions 257 and 285), not taken as the middle of the picture: a tail to one side must not push it off its base. Where a picture has its two bases is `bases` in `src/data/battle-backdrops.ts`; the rest is in `src/ui/scene-camera.ts`. Do not move a Pokémon by eye. After any change, look at all fifteen backgrounds with a Pokémon on each base before saying it is done: the owner sent the scene back three times for Pokémon that were not on their bases. Who is shown on each side is `src/features/battle/scene-focus.ts`. **Nothing on the top screen is pressed** (decision 272): who is looked at is picked in the two lines of the touch screen. **The plates never move** (decision 278); a **camera** moves the scene under them (decision 279).

Its pieces are **the games' own pixels** where a sheet has them (decision 255), cut by `scripts/assets/cut-battle-hud.ts` and placed by `BATTLE_HUD` and `BATTLE_TOUCH` in `src/data/sprites.ts`; every word on them is written by the app (decision 256). The tiles, the plates and the battery marks are drawn on whole pixels of the device (`usePixelScale(1)`), so a piece is within a tenth of its DS size, never exactly it: place what is written on a piece in the piece's own pixels (`--dn-hud-px`), not in DS pixels. The ball's two halves and the background fill the screen, and are drawn in DS pixels. The background is one of Showdown's backdrops (decision 268), taken back to its own pixels on a canvas (`src/ui/own-pixels.ts`).

The bases, in a picture's own pixels (238 × 158; measured on the pictures, which are one drawing of the ground under fifteen places):

| Piece | In the picture |
|---|---|
| Far base | 122 × 28 from (112, 60): its middle at (172.5, 73.5). As large as the games' far base on their screen (127 × 27) |
| Near base | 54 tall from row 97, from the picture's left side to column 160. It is an ellipse about 200 wide that the picture's left side cuts: its middle is at (57.5, 123.5), where an ellipse fitted to its right edge has it (decision 284). The middle of what is drawn, 80, is not the base's middle: the owner refused it |
| The beach (221 × 158) | bases of its own, a little narrower: (160.5, 73.5) and (56.5, 123.5) |

**Showdown's own placement is not followed** (decision 283). Its client (commit `1cf9b38`: `BattleScene.pos` in `battle-animations.ts`, `.backdrop` in `battle.css`) has a frame of 640 × 360, draws a backdrop at the size it is served from (-50, -90), and centres a Pokémon's picture on (210, 245) on the near side and (430, 135) on the far side, at 2 and 1 frame pixels a pixel. In a picture's own pixels those points are (82, 106) and (152, 71): the far one is 21 left of the far base's middle, and both are a picture's middle, not its feet. With Pokémon a third of the games' size it does not show; at the games' size they stand beside their bases.

The scene at rest (`sceneLayout`): a picture's whole height is the screen's, so one of its pixels is 1.2 DS pixels (192 / 158); across, its far base's middle is 190 from the left, where the games' far base is (186.5 and 193 on the screenshots):

| Piece | Place on the screen, in DS pixels |
|---|---|
| Background | 289.2 × 192 from (-19.6, 0); the beach 268.6 wide, from -5. The message band lies over its foot; a veil over it for the hour (decision 275) |
| Far Pokémon, seen from the front | the middle of its feet at (190, 92.3): 3 under its base's middle; 1 DS pixel a pixel, exactly |
| Near Pokémon, seen from behind | the middle of its feet at (50.3, 154.6), at (63.6, 154.6) on the beach: 4.5 under its base's middle, under the edge of the message band as in the games; 1.5 DS pixels a pixel, exactly. One over 67 pixels wide is cut by the screen's left edge, as the games' large ones are |
| A Pokémon too tall for the room over its feet | stands lower, its head 2 from the top: over 90 pixels tall on the far side, 101 on the near side |
| Far plate | against the left edge; its name from 30 down, its band from 40 |
| Near plate | against the right edge; its name from 110 down, its band from 120 |
| A plate | its name row 10 tall, then the games' band: 124 × 9 (far), 120 × 9 or 120 × 14 with the HP in numbers (near, the played Pokémon's); "HP" in its box 13 wide, the bar in its well 48 × 2 |
| Agony on a plate (decisions 266 and 280) | the badge AGN before the box; three bars in the well, a pixel of the band apart; no "HP" |
| Message band | bottom 46, over both Pokémon |

The camera (`layerView`, `heldCamera`, `SHOTS`, `ROAM`; decision 279, Denborn's own after the games'). The background and the far Pokémon are one layer, the near Pokémon another, 1.5 times nearer as it is drawn 1.5 times larger. A camera is `x` across and `y` down, in the DS pixels the far layer then shifts the other way by, and `z` forward, as a share of the way to the near Pokémon. A layer `d` away (1.5 for the far one, 1 for the near one) is drawn `d / (d - z)` times its size, about the point (128, 64), and shifted by `-(x, y) × 1.5 / (d - z)`. The camera is held where the background still covers the screen.

| Shot | Camera (x, y, z) | When |
|---|---|---|
| `home` | (0, 0, 0) | nothing asks for it |
| `roam` | rests 2.5 s; 7 s to (-3, 1, 0.08), stays 1.2 s; 9 s to (4, 2, 0.04), stays 1.2 s; 6 s home; again | a choice is awaited |
| `far` | (-4, 4, 0.15), in 0.48 s | a round is told about the far side's Pokémon |
| `near` | (-8, 2, 0.1), in 0.48 s | a round is told about the near side's Pokémon |

Touch screen, commands (256 × 192). The ball is 12 rows lower than in the games, so that a whole tile and an order of the round fit on each side of the belt:

| Piece | Place |
|---|---|
| The ground | the screen's own colour, `--dn-shell-2`, the brown the sheet has between the halves |
| The ball's halves (`BATTLE_TOUCH`) | each 256 wide, one of its pixels a DS pixel: the red one's 109 rows from y = -8, the white one's 99 from y = 101 |
| The belt | y 91 to 111 at the screen's sides; its notch y 74 to 128, x 72 to 182 flat, slanting out to x 50 and 206 |
| Strip | y 0 to 10; nothing in it is pressed; it stays while the screen's pieces fly |
| WAIT, TOOLS (game master), INFO | the games' tiles upside down, whole, from y = 10 (decision 260); INFO opens the battlefield (decision 274) |
| The line facing, over FIGHT | y 53 to 75: the party's order for the game master; the foes by their places for a player (decision 272) |
| FIGHT | written in the notch: the button is y 78 to 124, 144 wide; nothing is drawn for it (decision 259) |
| The seat's own line, under FIGHT | y 127 to 149, in the round's order; a press on a Pokémon of either line puts it on the scene |
| BAG, SWITCH, RUN | the games' tiles where the games put them: 78 × 60 at x 0 and 178 from y 132, 76 × 44 at x 90 from y 148 |

Touch screen, moves (decision 261): the ball open, the red half 69 up (12 rows of it left under the strip) and the white one 26 down. The six moves in the belt, two across and three down, from y 23 to 131, 4 from each side. On the white half: BACK on RUN's tile, in its place; left of it, for the game master, what is lined up for an enemy and the buttons to change it, or STRUGGLE.

Touch screen, battlefield plan: the far line above the near one (the foes' above the party's for a player, the party's above the enemies' for the game master); between them the terrain and the weather, by name only, each a `TypeLabel` (the terrain in its own type: Electric, Grass, Fairy for Misty, Psychic; the weather in Water for rain, Fire for sun, Rock for a sandstorm, Ice for snow); at the foot MORE with the number of effects, and BACK; tiles 40 × 54 at a pitch of 42, so six fill the 256 of the width; each line centred. With lines of different lengths the tiles are offset by half a pitch, which is exactly the rules' geometry: a foe is in reach when its tile overlaps or touches the column of yours.

Touch screen, effects (behind MORE): a scrolling list, one dithered panel per effect: mark, name, turns left in gold, scope, description. The mark is a diamond for the whole field, an arrow up for the foes' side, an arrow down for the party's: the sides as they lie on the plan. An effect on a single Pokémon adds that Pokémon's letter after the arrow. Order: the field, the two sides, then each Pokémon, foes first.

A Pokémon that carries stat changes or effects of its own has a gold mark (an arrow up over an arrow down, 7 × 9) at the top right of its tile and beside the badges of its HUD box.

A tile of the plan is never under 44 px. The game master's order bars are the one thing smaller (22 DS pixels a Pokémon, never under 24 px): the same Pokémon can be picked full size from its tile of the plan.

## Not designed yet

The screens behind the commands, but for the moves (the plan to pick on, the Bag, the party's list, a Pokémon's sheet), still have the look they had before decision 255; the move buttons themselves keep their look, smaller: a sheet has pieces for some of them (the party screen, the Bag). Ask the owner before cutting a new set of pieces; do not improvise them from this file.
