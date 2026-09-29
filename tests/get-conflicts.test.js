import test from 'tape'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createScenario } from '../scripts/examples/index.js'
import getConflicts from '../src/lib/conflicts.js'

test('getConflicts returns an array of parsed files with basename, relative, and absolute paths', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'zipper-parsed-'))
  t.teardown(() => rmSync(temporary, { recursive: true, force: true }))
  const cwd = join(temporary, 'dummy')
  createScenario('clean', cwd)
  t.deepEqual(await getConflicts({ cwd }), [], 'clean repository returns an empty array')
  createScenario('multi', cwd)
  const root = realpathSync(cwd)
  execFileSync('git', ['config', 'diff.relative', 'true'], { cwd })
  const result = await getConflicts({ cwd: join(cwd, 'config') })
  t.deepEqual(
    result.map(({ relative }) => relative),
    ['config/settings.json', 'menu.txt', 'notes with spaces.txt'],
    'includes all files even from a subdirectory'
  )
  t.deepEqual(result.map(({ filename }) => filename), ['settings.json', 'menu.txt', 'notes with spaces.txt'], 'filename is the basename')
  for (const file of result) {
    t.equal(file.absolute, join(root, file.relative), 'absolute path resolves from repository root')
  }
  const menu = result.find(({ relative }) => relative === 'menu.txt')
  t.equal(menu.error, null)
  t.equal(menu.conflicts.length, 1)
  t.equal(menu.conflicts[0].ours.text, 'Drink: tea\n')
  t.equal(menu.conflicts[0].theirs.text, 'Drink: coffee\n')
  t.equal(menu.sections.map(({ text }) => text).join(''), readFileSync(join(cwd, 'menu.txt'), 'utf8'), 'preserves the original file')

  const block = '<<<<<<< ours\r\nleft\r\n||||||| base\r\noriginal\r\n=======\r\nright\r\n>>>>>>> theirs\r\n'
  writeFileSync(join(cwd, 'menu.txt'), `before\r\n${block}between\r\n${block}after`)
  const multiple = (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt')
  t.equal(multiple.conflicts.length, 2, 'returns multiple conflicts within one file')
  t.equal(multiple.conflicts[0].base.text, 'original\r\n', 'retains diff3 base and line endings')
  t.equal(multiple.sections.length, 5, 'retains surrounding text sections')

  writeFileSync(join(cwd, 'menu.txt'), 'Resolved but not staged\n')
  const resolved = (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt')
  t.deepEqual(resolved.conflicts, [], 'an unmerged index entry may have no remaining markers')
  t.equal(resolved.error, null)

  writeFileSync(join(cwd, 'menu.txt'), '<<<<<<< broken\n')
  const malformed = await getConflicts({ cwd })
  const invalid = malformed.find(({ relative }) => relative === 'menu.txt')
  t.equal(invalid.filename, 'menu.txt', 'failed files retain their basename')
  t.equal(invalid.absolute, join(root, 'menu.txt'), 'failed files retain their absolute path')
  t.match(malformed.find(({ relative }) => relative === 'menu.txt').error.message, /Unterminated/)
  t.equal(malformed.find(({ relative }) => relative === 'menu.txt').error.lineNumber, 1)
  t.equal(
    malformed.find(({ relative }) => relative === 'config/settings.json').conflicts.length,
    1,
    'another file still parses'
  )

  rmSync(join(cwd, 'menu.txt'))
  t.equal(
    (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt').error.code,
    'ENOENT',
    'missing working tree file stays listed'
  )
  writeFileSync(join(cwd, 'menu.txt'), Buffer.from([0, 1, 2]))
  t.match(
    (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt').error.message,
    /Binary/
  )
  writeFileSync(join(cwd, 'menu.txt'), Buffer.from([0xff]))
  t.ok(
    (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt').error,
    'invalid UTF-8 is not silently corrupted'
  )
  rmSync(join(cwd, 'menu.txt'))
  symlinkSync(join(cwd, 'config/settings.json'), join(cwd, 'menu.txt'))
  t.match(
    (await getConflicts({ cwd })).find(({ relative }) => relative === 'menu.txt').error.message,
    /Not a regular file/,
    'does not follow symlinks'
  )
})
