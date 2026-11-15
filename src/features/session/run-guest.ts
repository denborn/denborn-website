/**
 * A session being joined: the player's logic (guest.ts) tied to its line to
 * the relay. The screen is told where the player stands each time it
 * changes, and the copy of the character that counts is handed over to be
 * kept when the game master's side gives one back.
 */
import { type RelayLink, type RelayLinkOptions, openRelayLink, roomUrl } from '../../network/relay-link.ts'
import type { Intent } from '../../shared/protocol/battle.ts'
import { encodeMessage } from '../../shared/protocol/session.ts'
import type { CharacterDocument } from '../../shared/schema/character.ts'
import { newId } from '../../storage/ids.ts'
import { GUEST_START, type GuestEvent, type GuestState, guestStep } from './guest.ts'

export interface GuestRunOptions {
  /** The session's join code. */
  code: string
  /** The site's address, where the relay lives. */
  origin: string
  /** What makes this device the same player on every return to the room. */
  token: string
  /** The version of the game data this app carries. */
  dataPackVersion: string
  /** The character this device brought to the room before, if it still has it. */
  character: CharacterDocument | undefined
  onChange: (state: GuestState) => void
  /** The game master's side gave back a copy of the character that is not the device's: it is the one that counts. */
  onKeep: (character: CharacterDocument) => void
  /** Opens the line. The real one by default; a test passes its own. */
  open?: (options: RelayLinkOptions) => RelayLink
  /** Makes the id that tells one intent from every other. */
  newId?: () => string
}

export interface GuestRun {
  state(): GuestState
  /** Asks to come in with a character. */
  choose(character: CharacterDocument): void
  /** Leaves the session, or takes a request back. */
  leave(): void
  /**
   * Asks something for the player's Pokémon in the fight, and gives the id
   * its answer will carry. Nothing is taken for done before that answer: the
   * fight shown is the one the game master's side tells.
   */
  intend(intent: Intent): string
  /** The player has read what their character was awarded at the end of an encounter. */
  rewardsRead(): void
  /** Closes the line without leaving: a member stays a member, and the game master sees it away. */
  stop(): void
}

export function runGuest(options: GuestRunOptions): GuestRun {
  let state: GuestState = GUEST_START
  let character = options.character

  const apply = (event: GuestEvent): void => {
    const step = guestStep(state, event, { character, dataPackVersion: options.dataPackVersion })
    state = step.state
    for (const message of step.send) link.send({ t: 'send', body: encodeMessage(message) })
    if (step.keep) {
      // The rules the device kept with its copy still go with it: the game master's copy travels without them.
      character = { ...step.keep, ...(character?.rules ? { rules: character.rules } : {}) }
      options.onKeep(character)
    }
    // Out is out: the line has nothing more to carry.
    if (state.at === 'out') link.close()
    options.onChange(state)
  }

  const link = (options.open ?? openRelayLink)({
    url: roomUrl(options.code, options.origin),
    hello: { t: 'join', token: options.token },
    // Connected is not yet in the room: the relay says so with `joined`.
    onUp: () => undefined,
    onFrame: (frame) => {
      if (frame.t === 'joined') apply({ on: 'joined', host: frame.host })
      else if (frame.t === 'host') apply({ on: 'host', present: frame.present })
      else if (frame.t === 'msg') apply({ on: 'message', body: frame.body })
    },
    onDown: (code) => apply({ on: 'closed', code }),
  })

  return {
    state: () => state,
    choose: (chosen) => {
      character = chosen
      apply({ on: 'chosen' })
    },
    leave: () => apply({ on: 'leave' }),
    intend: (intent) => {
      const id = (options.newId ?? newId)()
      apply({ on: 'intend', id, intent })
      return id
    },
    rewardsRead: () => apply({ on: 'rewardsRead' }),
    stop: () => link.close(),
  }
}
