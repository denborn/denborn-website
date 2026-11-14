/**
 * Versions written into every saved battle. A battle only resumes when all of
 * them match what the running app has (see DenbornBattle.restore).
 */

/** The @pkmn/sim version this adapter was proven against. A test checks it against the installed package. */
export const ENGINE_VERSION = '0.10.12'

/**
 * Bumped whenever a change to the adapter could make a saved battle play out
 * differently: an override, an event handler, the shape of the adapter's state.
 */
export const ADAPTER_VERSION = 1

export const FORMAT_NAME = '[Gen 9] Denborn'
export const FORMAT_ID = 'gen9denborn'
export const MOD_ID = 'denborn'
