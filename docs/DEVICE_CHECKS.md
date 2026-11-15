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

## Installed app, offline, camera (from milestones 4 and 5; still to do)

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | iPhone (Safari, Share, Add to Home Screen) and Android (Chrome, Install app): install, then open from the home screen. | The app opens full screen, in portrait. | |
| 2 | Open the app once online and wait for "ready offline" in Options. Turn on airplane mode, close the app, open it again, create a character from a creation link kept earlier. | Everything works offline but JOIN A SESSION. | |
| 3 | In the installed app: Characters, IMPORT, scan another phone's character QR code. | The camera opens inside the app and the character is shown before it is kept. | |
| 4 | On a character's sheet, SHARE, PRINT ITS SHEET. | One page, with the boxes to pencil in. | |
