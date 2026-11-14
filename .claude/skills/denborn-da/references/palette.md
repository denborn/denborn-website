# Measured colours

Read with `tools/sheet-colors.ts` on the sheets in `tmp/`. The token names are those of `src/ui/tokens.css`, which is the single source of truth for values; this file records where each was read, so that it can be checked again.

## B2W2 "HP Bars" sheet

| What | Value | Token |
|---|---|---|
| Box frame | `#101010` | `--dn-ink` |
| Black 2 box body, two-colour checker | `#181818`, `#303030` | `--dn-panel`, `--dn-panel-2` |
| Hard shadow under and right of a box (2 px) | `#495151` | `--dn-panel-edge` |
| White 2 box body | `#c6c6c6`, `#adadad` | `--dn-panel-light`, `--dn-panel-light-2` |
| Text, and its shadow | `#f3f3f3`, `#9a929a` | `--dn-text`, `--dn-text-shadow` |
| Outline around names over the scene | `#181818` | `--dn-ink-soft` |
| HP green, light and shade | `#00fb49`, `#008a28` | `--dn-hp-high*` |
| HP yellow | `#f3b200`, `#9a6110` | `--dn-hp-mid*` |
| HP red | `#fb3041`, `#922030` | `--dn-hp-low*` |
| EXP | `#00baf3`, `#00799a` | `--dn-exp*` |
| "Lv." and "HP" gold | `#f3b200`, `#9a6110` | `--dn-label-gold*` |
| Male mark, female mark (example boxes) | `#00baf3`, `#fb3041` | `--dn-male`, `--dn-female` |
| Status: SLP, PSN, bad PSN (and its text), BRN, FRZ, PAR | `#4a4a4a`, `#6b2942`, `#391042` (`#d631de`), `#b50000`, `#005a8c`, `#ad6b00` | `--dn-status-*` |

Example boxes (sheet rows 254 to 273): the name and level sit just above a plate 9 px tall for the foe, 13 px for the player (with the HP numbers); frame 1 px, shadow 2 px.

## BW "Party Screen" sheet

Read at the middle row of each slot (y = 222, 270, 318), at x = 10 (left band), 60 (middle), 118 (right band), and about 130 px further right on the first row for the selected slot.

| State | Left band | Middle | Right band | Outline |
|---|---|---|---|---|
| Normal | `#386890` | `#002038` | `#004060` | `#88f8f0` |
| Selected | `#00a8f8` | `#086890` | `#0088d8` | white over `#48f8f0` (the kit draws white) |
| Fainted (Denborn: downed) | `#a84028` | `#601810` | `#801010` | `#f88898` |
| Confirmed | `#10d8b0` | `#088068` | `#08c0a0` | white |

The bands are split by two arrowheads pointing left; the corners are cut at 45°.

## B2W2 "Options Screen" sheet

| What | Value | Token |
|---|---|---|
| Backdrop, and its plus marks | `#000000`, `#183931` | `--dn-backdrop`, `--dn-backdrop-mark` |
| Unselected button, and its text | `#393952`, `#9c9cad` | `--dn-option`, `--dn-text-muted` |
| Selected button, upper band and body | `#088cb5`, `#085a8c` | `--dn-option-selected-band`, `--dn-option-selected` |
| Selected button's outline | `#63b5b5` | `--dn-select-line` |

## BW "Battle HUD" sheet

| What | Value | Token |
|---|---|---|
| Tile greys | `#393939`, `#424242`, `#313131`, `#292929` | `--dn-tile*` |
| Tile rim | white; thin lines `#737373` | `--dn-text`, `--dn-tile-line` |
| Labels: FIGHT, BAG, RUN, POKéMON | `#ce0039`, `#ffb529`, `#29bdf7`, `#73ff52` | `--dn-cmd-*` |
| Touch-screen background | `#4a3939`, `#423131` | `--dn-shell*` |
| Ball red, and its lighter crescent | `#9c0021`, `#b50029` | `--dn-ball-red*` |
| Ball white, and its lighter crescent | `#cecee7`, `#dedee7` | `--dn-ball-white*` |
| Message band (example screen, sheet rows 465 to 467) | scene × 0.4; top line adds red 73, second line red 31 | `--dn-message-*` (black, `#7a0200` and `#340200` at 60%) |

BW's own HP bar colours (green `#00ff4a` / `#00bd21`, yellow `#eaff00` / `#adbd00`, red `#ff0000` / `#bd0000`) were measured too and are not used: the HUD follows Black 2.

## Types

Fill and shade of each BW type label, as published in PokéAPI's sprite repository; Fairy from Showdown's label. Values in `tokens.css` (`--dn-type-*`).
