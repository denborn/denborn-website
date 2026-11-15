/**
 * Whether two values read from saved documents are alike, whatever the order
 * of their keys. A key left out and a key with nothing in it are alike: not
 * every writer of a document writes an absent value the same way.
 */
export function sameValue(one: unknown, other: unknown): boolean {
  if (one === other) return true
  if (typeof one !== 'object' || typeof other !== 'object' || one === null || other === null) return false
  if (Array.isArray(one) !== Array.isArray(other)) return false
  const left = one as Record<string, unknown>
  const right = other as Record<string, unknown>
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].every((key) => sameValue(left[key], right[key]))
}
