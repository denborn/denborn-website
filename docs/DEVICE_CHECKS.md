# Checks on real devices

What only the owner can check, on real phones. Nothing here is reported as done until the owner has done it and written the result in the last column. Tests in a desktop browser prove the logic; they say nothing of a real camera, a real home-screen app, or a phone that goes to sleep.

Site: https://denborn-website.kori-san.workers.dev

## A fight on two phones (milestone 6)

One device hosts (a laptop, a tablet or a phone), two phones play. About 15 minutes.

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | Game master: open a campaign, HOST A SESSION, prepare an encounter if there is none. Each phone: JOIN A SESSION by scanning the QR code with the app's own scanner, pick a character. Let both in. | Both phones show the party. | |
| 2 | Game master: tap the encounter, LAUNCH. | Each phone shows the scene with its own Pokémon and "What will … do?". The first launch waits a few seconds while the battle engine downloads. | |
| 3 | Phone A: FIGHT, a move, a target on the battlefield. Phone B: RUN, tap phone A's Pokémon. Phone A: ACCEPT. | Phone B sees what A locked in the ORDER list. The two Pokémon trade places on both phones. | |
| 4 | Lock an action on each phone, then give every enemy a move on the console. | The round is told step by step on both phones, sprites move, HP bars go down, and SKIP brings the commands back. | |
| 5 | During the choices, lock phone A's screen for 30 seconds, then unlock it. | The console shows that player AWAY, then back. The phone shows the same fight, same round, without asking to join again. | |
| 6 | Game master: reload the page in the middle of a round's choices. | The console comes back at the same round with the same HP and the same locks. Phones show the game master away, then the fight again. | |
| 7 | Game master: END THE ENCOUNTER, change an amount, AWARD AND END. | Each phone says what its character received. Each character's sheet (Characters, then the character) shows the new EXP, Pokédollars and HP. | |
| 8 | On one phone, Options: set the text speed to FAST, then play another round. | Messages go by faster on that phone only. | |

Also worth a look while playing: the touch targets (WAIT and BATTLEFIELD in the corners, the tiles of the battlefield), the text size of the messages, and whether anything is cut off at the bottom of the phone (the home bar of an iPhone).

## Between two fights, on two phones (milestone 7)

One device hosts, two phones play, each with a character in the session and no fight on. About 15 minutes. It needs a fight first for steps 4 to 6: let one character go down, and hurt the other.

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | Phone A: on the session screen, "Your character", PLACE POINTS. Move a slider with a finger, then use + and −. PLACE, then PLACE again. | The stats on the top screen follow the sliders. The question stays above the buttons. "The points are placed." and − stops where the points now are. | |
| 2 | Game master: tap phone A's character, GIVE OR TAKE. Give EXP, change its Pokédollars, add an evolution stone its species uses. CONFIRM. | Phone A says what was given and the level reached. The game master's screen says the sheet is changed. | |
| 3 | Phone A: EVOLVE, tap the evolution, EVOLVE. | The question names the Ability it will have and the stone used up. Then the new Pokémon on the top screen and "Congratulations!". The other phone shows the new Pokémon in the party. | |
| 4 | Phone A: BAG, tap a Potion, USE. | The party is listed; a Pokémon at full HP is dimmed and cannot be tapped; the hurt one can, and its HP rises. | |
| 5 | Phone A, with phone B's character downed: BAG, scroll to "…’s Bag". Tap an item, TAKE, set how many, TAKE. | The items are in phone A's Bag and gone from the other. | |
| 6 | Phone A: use a Revive from either Bag on phone B's character. | Phone B's character is back on its feet, and its Bag is no longer listed on phone A. | |
| 7 | Game master: tap a character, REST. Its phone: POKÉMON CENTER, change the Ability, drop a move and pick another, CONFIRM. | Full HP and PP. The moves it knows are listed first. After CONFIRM the Pokémon Center row is gone from the phone and "resting" from the game master's screen. | |
| 8 | Phone A: lock the screen for 30 seconds while on the BAG screen, then unlock. | The screen says the connection dropped, then the buttons work again. | |

Also worth a look: whether the sliders are easy to set to an exact value on a small phone, and whether the line of text over BACK hides too much of the list on a short screen.

## Installed app, offline, camera (from milestones 4 and 5; still to do)

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | iPhone (Safari, Share, Add to Home Screen) and Android (Chrome, Install app): install, then open from the home screen. | The app opens full screen, in portrait. | |
| 2 | Open the app once online and wait for "ready offline" in Options. Turn on airplane mode, close the app, open it again, create a character from a creation link kept earlier. | Everything works offline but JOIN A SESSION. | |
| 3 | In the installed app: Characters, IMPORT, scan another phone's character QR code. | The camera opens inside the app and the character is shown before it is kept. | |
| 4 | On a character's sheet, SHARE, PRINT ITS SHEET. | One page, with the boxes to pencil in. | |
