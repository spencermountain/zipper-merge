// Markers must occupy a whole line. Labels follow a space or tab; the separator
// has no label. Longer runs support Git's custom conflict-marker-size setting.
const readMarker = (line) => {
  const match = /^(<{7,}|\|{7,}|={7,}|>{7,})(?:[ \t](.*))?$/.exec(line)
  if (!match || (match[1][0] === '=' && match[2] !== undefined)) return null
  return { kind: match[1][0], size: match[1].length, label: match[2] ?? '' }
}

/**
 * Split a conflicted file into ordered text and conflict sections.
 *
 * Each section includes its original `text`, inclusive 1-based line numbers,
 * and UTF-16 string offsets (start inclusive, end exclusive). Concatenating
 * section.text reproduces the input exactly, including CRLF and missing EOF LF.
 * Conflicts also contain ours/theirs { label, text }, an optional base, and
 * markerSize. Supports merge, diff3, and zdiff3 layouts with markers >= 7 chars.
 *
 * An opening marker starts a strict state machine: malformed or incomplete
 * conflicts throw SyntaxError with a lineNumber. Other markers outside a
 * conflict remain ordinary text (for example a line of equals signs).
 */
export const parseConflicts = (text) => {
  if (typeof text !== 'string') throw new TypeError('Expected file contents as a string')
  const sections = []
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? []
  let offset = 0
  let plainStart = 0
  let plainLine = 1
  let conflict = null
  let side = null

  const fail = (message, lineNumber) => {
    const error = new SyntaxError(`${message} at line ${lineNumber}`)
    error.lineNumber = lineNumber
    throw error
  }
  const addText = (endOffset, endLine) => {
    if (endOffset > plainStart) {
      sections.push({
        type: 'text', startLine: plainLine, endLine,
        startOffset: plainStart, endOffset, text: text.slice(plainStart, endOffset)
      })
    }
  }

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1
    const marker = readMarker(line.replace(/\r?\n$/, ''))
    const endOffset = offset + line.length

    if (!conflict) {
      if (marker?.kind === '<') {
        addText(offset, lineNumber - 1)
        conflict = {
          type: 'conflict', startLine: lineNumber, startOffset: offset,
          markerSize: marker.size,
          ours: { label: marker.label, text: '' }, base: null,
          theirs: { label: '', text: '' }
        }
        side = 'ours'
      }
    } else if (!marker) {
      conflict[side].text += line
    } else {
      if (marker.size !== conflict.markerSize) fail('Mismatched conflict marker length', lineNumber)
      if (marker.kind === '|' && side === 'ours') {
        conflict.base = { label: marker.label, text: '' }
        side = 'base'
      } else if (marker.kind === '=' && (side === 'ours' || side === 'base')) {
        side = 'theirs'
      } else if (marker.kind === '>' && side === 'theirs') {
        conflict.theirs.label = marker.label
        sections.push({
          ...conflict, endLine: lineNumber, endOffset,
          text: text.slice(conflict.startOffset, endOffset)
        })
        conflict = null
        side = null
        plainStart = endOffset
        plainLine = lineNumber + 1
      } else {
        fail(`Unexpected ${marker.kind.repeat(marker.size)} marker`, lineNumber)
      }
    }
    offset = endOffset
  }

  if (conflict) fail('Unterminated conflict starting', conflict.startLine)
  addText(text.length, lines.length)
  return sections
}

export default parseConflicts
