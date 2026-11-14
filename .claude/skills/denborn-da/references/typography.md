# Type

## The games

- Names and levels in the HP boxes: capitals about 7 to 8 px tall, white `#f3f3f3` with a 1 px outline `#181818`.
- Messages: capitals about 10 px tall, lines 16 px apart, white with a 1 px grey shadow down and right, two lines in a band 45 px tall.
- "Lv." and "HP" are small gold labels; HP numbers and the "HP" on the plate are slanted.
- Command labels are capitals with a dark outline; FIGHT is larger, red.

## The font: VT323

Chosen by the owner on 2026-11-14 (decision 82) among four candidates shown on the board, all under the SIL Open Font License 1.1. Measured in Chromium at 100 px: capital height, x-height, average letter width in a French sentence.

| Font | Capitals | x-height | Width | Scale to match the games | Notes |
|---|---|---|---|---|---|
| **VT323** (chosen) | 56 | 40 | 40.0 | 1.4 | Heavier than the games' letters and very readable; fixed width. |
| DotGothic16 | 81.5 | 56.8 | 50.0 | 1 | Thin one-pixel strokes, closest to the games' weight; uneven spacing in Latin text. |
| Pixelify Sans | 63.1 | 45 | 48.6 | 1.25 | Stylised; "a" reads as "o" at small sizes. |
| Tiny5 | 62.5 | 50 | 43.3 | 1.3 | Five-pixel capitals: coarse at these sizes. |

`--dn-font-scale: 1.4` gives VT323's capitals the games' heights at the kit's sizes 10 (names) and 12 (messages). It is loaded by `src/ui/styles.css` from `@fontsource/vt323`, `latin` and `latin-ext` only. Being fixed-width, a letter is 0.4 of the font size wide: at size N it takes N × 0.56 DS pixels. Use that to check that a longest name fits before building.

Longest strings in the data pack (2026-11-14): move names 16 letters in both languages, species names 10, type names 8 (Électrik, Ténèbres, Electric, Fighting). Nicknames go to 24.

## French

Accents are where pixel fonts fail. Every text piece is checked with: é è ê ë à â ç ù û ü î ï ô œ É È À Ç Œ « ». The space before ! and ? is written as a no-break space (`\u00a0`) in `src/i18n/fr.ts`. French runs about a fifth longer than English: check buttons and the message band in French first.
