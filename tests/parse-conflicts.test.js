import test from 'tape'
import { parseConflicts } from '../src/lib/parse-conflicts.js'

const checkRoundTrip = (t, text, sections) => {
  t.equal(sections.map((section) => section.text).join(''), text, 'preserves the full input')
  for (const section of sections) {
    t.equal(text.slice(section.startOffset, section.endOffset), section.text, 'offsets select exact text')
  }
}

test('parseConflicts preserves ordinary text', (t) => {
  t.deepEqual(parseConflicts(''), [], 'empty input has no sections')
  const text = 'hello 🌎\r\n=======\n  <<<<<<< indented\n<<<<<<<not-a-marker'
  const sections = parseConflicts(text)
  t.deepEqual(sections, [{
    type: 'text', startLine: 1, endLine: 4, startOffset: 0,
    endOffset: text.length, text
  }], 'marker-like content outside conflicts stays untouched')
  checkRoundTrip(t, text, sections)
  t.throws(() => parseConflicts(null), TypeError, 'requires a string')
  t.end()
})

test('parseConflicts returns multiple conflicts and surrounding text', (t) => {
  const text = [
    'before 🌎', '<<<<<<< HEAD', 'tea', '=======', 'coffee', '>>>>>>> incoming',
    'between', '<<<<<<< branch with spaces', 'light', '=======', 'dark', '>>>>>>> other', 'after'
  ].join('\n')
  const sections = parseConflicts(text)
  t.deepEqual(sections.map(({ type }) => type), ['text', 'conflict', 'text', 'conflict', 'text'])
  const first = sections[1]
  t.equal(first.startLine, 2, 'line numbers are one-based')
  t.equal(first.endLine, 6, 'end line includes the closing marker')
  t.equal(first.markerSize, 7)
  t.deepEqual(first.ours, { label: 'HEAD', text: 'tea\n' })
  t.deepEqual(first.theirs, { label: 'incoming', text: 'coffee\n' })
  t.equal(first.base, null, 'standard conflicts have no base section')
  t.equal(sections[3].ours.label, 'branch with spaces', 'preserves labels with spaces')
  t.equal(sections[4].text, 'after', 'preserves missing final newline')
  checkRoundTrip(t, text, sections)
  t.end()
})

test('parseConflicts handles diff3/zdiff3 base sections and custom markers', (t) => {
  const text = [
    'shared', '<<<<<<<<<< ours', 'tea', '|||||||||| base revision',
    'water', '==========', 'coffee', '>>>>>>>>>> theirs', 'shared tail'
  ].join('\r\n')
  const sections = parseConflicts(text)
  const conflict = sections[1]
  t.equal(conflict.markerSize, 10, 'recognizes custom marker length')
  t.deepEqual(conflict.ours, { label: 'ours', text: 'tea\r\n' })
  t.deepEqual(conflict.base, { label: 'base revision', text: 'water\r\n' })
  t.deepEqual(conflict.theirs, { label: 'theirs', text: 'coffee\r\n' })
  t.equal(conflict.startLine, 2)
  t.equal(conflict.endLine, 8)
  checkRoundTrip(t, text, sections)
  t.end()
})

test('parseConflicts handles empty sides and adjacent conflicts', (t) => {
  const text = '<<<<<<<\n=======\n>>>>>>>\n<<<<<<< ours\n|||||||\n=======\n>>>>>>> theirs'
  const sections = parseConflicts(text)
  t.equal(sections.length, 2, 'does not create empty context sections')
  t.deepEqual(sections[0].ours, { label: '', text: '' })
  t.deepEqual(sections[0].theirs, { label: '', text: '' })
  t.deepEqual(sections[1].base, { label: '', text: '' }, 'empty base differs from absent base')
  t.equal(sections[1].endLine, 7)
  checkRoundTrip(t, text, sections)
  t.end()
})

test('parseConflicts rejects malformed conflicts without returning partial results', (t) => {
  const cases = [
    ['<<<<<<< ours\ntext', /Unterminated conflict starting at line 1/],
    ['<<<<<<< ours\n=======\ntext', /Unterminated conflict/],
    ['<<<<<<< ours\n>>>>>>> theirs', /Unexpected.*line 2/],
    ['<<<<<<< ours\n<<<<<<< nested', /Unexpected.*line 2/],
    ['<<<<<<< ours\n=======\n=======', /Unexpected.*line 3/],
    ['<<<<<<< ours\n=======\n||||||| base', /Unexpected.*line 3/],
    ['<<<<<<< ours\n||||||| base\n||||||| again', /Unexpected.*line 3/],
    ['<<<<<<< ours\n========\n>>>>>>> theirs', /Mismatched.*line 2/]
  ]
  for (const [text, pattern] of cases) t.throws(() => parseConflicts(text), pattern)
  try {
    parseConflicts('before\n<<<<<<< ours')
    t.fail('expected an incomplete-conflict error')
  } catch (error) {
    t.ok(error instanceof SyntaxError)
    t.equal(error.lineNumber, 2, 'exposes the source line for UI errors')
  }
  t.end()
})
