/**
 * A move's maximum PP (decision 3): its base PP, raised by a fifth for each
 * PP Up, up to three (a PP Max is three at once). A few moves cannot be
 * raised. The engine uses the same formula; a test in src/battle proves it.
 */

export const PP_UPS_MAX = 3

export function maxPp(basePp: number, ppUps: number, fixed: boolean): number {
  return fixed ? basePp : (basePp * (5 + ppUps)) / 5
}
