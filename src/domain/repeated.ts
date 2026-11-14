/** The values that appear more than once in a list, each given once. */
export function repeated<T>(values: readonly T[]): T[] {
  const seen = new Set<T>()
  const twice = new Set<T>()
  for (const value of values) (seen.has(value) ? twice : seen).add(value)
  return [...twice]
}
