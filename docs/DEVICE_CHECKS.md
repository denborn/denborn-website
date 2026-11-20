# Checks on real devices

What only the owner can check, on real phones. Nothing here is reported as done until the owner has done it and written the result in the last column. Tests in a desktop browser prove the logic; they say nothing of a real camera, a real home-screen app, or a phone that goes to sleep.

Site: https://denborn-website.kori-san.workers.dev

The preferred way to play, and so to check: the game master on a computer, each player on a phone (the owner, 2026-11-16).

**2026-11-16**: the owner reported having tested on phones that way. The result of each check below is still theirs to write down.

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

## The release's own checks (milestone 8)

One phone that has never opened the site, or its site data cleared first. About 10 minutes.

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | Open the site on mobile data or a slow Wi-Fi. Watch the line under the home screen's buttons. | "Getting ready to work offline…", then "Works offline. Fetching the Pokémon sprites: … of 346.", then "Ready to work offline." Note how long each takes. | |
| 2 | Clear the site's data, open the site again, and turn on airplane mode as soon as the home screen shows. | The three Pokémon of the home screen may show as MissingNo. (the glitch block, moving), never as an empty space. Turn airplane mode off: the count moves again by itself, and the real sprites show after a reload. | |
| 3 | Install the app (iPhone: Share, Add to Home Screen; Android: Install app). | The icon is the den with its pink light on black, not a letter D and not a screenshot. On Android it is not cut through the den. | |
| 4 | Open the installed app. Look at the home screen, then open CREDITS. | The den's light moves on the home screen. The credits list eight names; tapping an underlined name opens its page outside the app. | |
| 5 | In the phone's accessibility settings, turn on "reduce motion", then reopen the app and start a fight. | The den stands still; sprites stand still; nothing slides or blinks; every message shows whole. | |
| 6 | Turn on VoiceOver (iPhone) or TalkBack (Android). Go from the home screen to a character's sheet, then join a session. | Each screen's title is read when it opens; every button says what it does; a Pokémon is read by its name, MissingNo. included. | |
| 7 | When a new version has been pushed: open the installed app, wait a minute on the home screen. | "A new version is ready." with UPDATE appears on the home screen and in the Options, and nowhere during a session or a fight. UPDATE reloads into the new version. | |

Also worth reading once on the Cloudflare dashboard, since only the account's owner can: the Worker's requests and the Durable Object's requests and duration after an evening of play. Pages, scripts and sprites are static files and do not count as Worker requests; a session does (one connection per device, and the messages it carries).

## The two screens (decisions 214 to 217)

One iPhone and one Android phone, each in the browser and as the installed app; a second phone to scan with. About 10 minutes. The browser tests run on one phone's size in a desktop browser: they say nothing of a real keyboard, a real finger or a real camera.

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | Open the app. Pass the title, open the Options, the credits, a character's sheet. | On every page: two screens of the same size, one over the other, in the middle of the phone, black above and below. Nothing is cut off under the notch or at the home bar. | |
| 2 | On the Options, drag the bottom screen up and down, then drag the top screen and the black around the screens. | Only what is inside the bottom screen moves; BACK stays in its place. The page itself never moves, bounces or reloads. | |
| 3 | Characters, NEW: press LINK and tap the field. Then CREATE with a campaign, SEARCH, and type "pika". As a game master, do the same for a move, and for an item of a campaign's pack. | The field stays in sight above the keyboard: it is at the top of what comes over the bottom screen. When the keyboard closes, the two screens are back where they were. Note what happens if not. | |
| 4 | A character's sheet, SHARE: scan the QR code on the top screen with another phone (Characters, IMPORT, SCAN). Do the same with a saved campaign's code, on the campaign's page. | Both are read as fast as before. The squares are a fifth smaller than they were (decision 99 was ruled on the larger ones): note it if the scan is slow. | |
| 5 | Turn the phone on its side, in the browser. | The two screens keep their size and the page scrolls down to the bottom one. Nothing is hidden. | |
| 6 | Game master's computer: open a session's console in a window, then make the window shorter. | The two screens get smaller together, in the middle of the window, both whole. The wheel scrolls the round inside the bottom screen. | |
| 7 | Go from the home to the Options, to the credits, and back; make a character step by step, going back a step once; open a character's sheet. (Decisions 218 and 219.) | Nothing fades and nothing is replaced at once. A screen's pieces fly out and the next ones fly in, by the other side when going back; black stripes sweep across the top screen when its picture changes; the den's rain never stops while the bottom screen changes. Nothing stutters, and a button answers as soon as it has landed. Note any screen that changes without moving. | |
| 8 | In a fight: FIGHT, BACK, BAG, BACK, then a move and its target. | The commands fly out and the moves fly in; nothing gets in the way of choosing within the round's time. Note it if the moves from one view to the next feel too long. | |
| 9 | Turn on "reduce motion" in the phone's settings and do step 7 again. | Each screen is replaced at once; nothing flies, nothing sweeps. | |
| 10 | Characters, NEW (decisions 287 and 290). Watch the Pokédex come; CREATE, then on the list of Pokémon: flick the wheel hard up and down, stop it with a finger, press a row above the middle one, drag the rail at its right from top to bottom. iPhone in Safari and installed, Android in Chrome and installed. | The Pokédex rises shut onto the bottom screen, its lid onto the top one, and its shutters part. The wheel runs on by itself after a flick and comes to rest on a row, never between two; the row pressed comes to the middle; the rail goes through the whole list. Nothing stutters, and the icons stay sharp at rest. Note anything that jumps, sticks between two rows, or scrolls the page. | |
| 11 | In creation: press and hold a plus on the roleplay attributes, then on the TV; tap a number and type one. Go to each of the eight steps, on the narrowest phone you have. | A held plus goes on, by one then by ten, and stops when let go. No step is cut off or scrolls; every key can be pressed without pressing its neighbour. Note any key too small for a thumb: the smallest are the steps of the bar across the top. | |
| 12 | Characters, NEW, QR, with a campaign's code on another phone (the campaign's page, on its game master's device). Refuse the camera once, then allow it. | The camera's picture is on the bottom screen, under SCAN A QR CODE; once the code is read it goes and the campaign is in the middle of the wheel. Refused, it says how to allow it; the red cross shuts it. | |

## Installed app, offline, camera (from milestones 4 and 5; still to do)

| # | Do | Expect | Result |
|---|---|---|---|
| 1 | iPhone (Safari, Share, Add to Home Screen) and Android (Chrome, Install app): install, then open from the home screen. | The app opens full screen, in portrait. | |
| 2 | Open the app once online and wait for "ready offline" in Options. Turn on airplane mode, close the app, open it again, Characters, NEW: create a character for a campaign whose creation link was opened earlier. | The campaign is on the wheel. Everything works offline but JOIN A SESSION; every Pokémon of the wheel has its sprite, or MissingNo. for one not fetched yet. | |
| 3 | In the installed app: Characters, IMPORT, scan another phone's character QR code. | The camera opens inside the app and the character is shown before it is kept. | |
| 4 | On a character's sheet, SHARE, PRINT ITS SHEET. | One page, with the boxes to pencil in. | |
