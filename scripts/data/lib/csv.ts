/**
 * A small CSV reader for PokéAPI's data files (RFC 4180: quoted fields may
 * hold commas, doubled quotes and line breaks).
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i)
    if (quoted) {
      if (char !== '"') field += char
      else if (text.charAt(i + 1) === '"') {
        field += '"'
        i++
      } else quoted = false
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text.charAt(i + 1) === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  // A last line without a line break.
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** Reads a CSV with a header line into one record per row, keyed by column name. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text)
  if (!header) return []
  return rows
    .filter((row) => row.length > 1 || row[0] !== '')
    .map((row) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ''])))
}
