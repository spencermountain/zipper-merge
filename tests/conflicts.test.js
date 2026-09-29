import test from 'tape'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createScenario } from '../scripts/examples/index.js'
import getConflicts from '../src/lib/conflicts.js'

test('dummy scenarios reset and produce real Git conflicts', (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'zipper-scenarios-'))
  t.teardown(() => rmSync(temporary, { recursive: true, force: true }))
  const directory = join(temporary, 'dummy')
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim()
  const conflicts = () => git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean)

  createScenario('simple', directory)
  t.deepEqual(conflicts(), ['menu.txt'], 'simple has one conflict')
  t.ok(existsSync(join(directory, '.git/MERGE_HEAD')), 'simple is a real merge')
  writeFileSync(join(directory, 'discard-me'), 'temporary edit')

  createScenario('multi', directory)
  t.notOk(existsSync(join(directory, 'discard-me')), 'reset discards previous edits')
  t.deepEqual(conflicts(), ['config/settings.json', 'menu.txt', 'notes with spaces.txt'], 'multi has three conflicts')

  createScenario('multi-step', directory)
  t.deepEqual(conflicts(), ['menu.txt'], 'first cherry-pick conflicts in menu')
  t.equal(git('symbolic-ref', '--short', 'HEAD'), 'main', 'stays on a branch')
  writeFileSync(join(directory, 'menu.txt'), 'Drink: resolved\n')
  git('add', 'menu.txt')
  const next = spawnSync('git', ['-c', 'core.editor=true', 'cherry-pick', '--continue'], {
    cwd: directory, encoding: 'utf8'
  })
  t.equal(next.status, 1, 'continuing stops on the next conflict')
  t.deepEqual(conflicts(), ['config/settings.json'], 'second cherry-pick conflicts in settings')
  writeFileSync(join(directory, 'config/settings.json'), '{ "theme": "resolved" }\n')
  git('add', 'config/settings.json')
  git('-c', 'core.editor=true', 'cherry-pick', '--continue')
  t.equal(git('status', '--porcelain'), '', 'both steps can be completed cleanly')

  createScenario('clean', directory)
  t.deepEqual(conflicts(), [], 'clean has no conflicts')
  t.equal(git('status', '--porcelain'), '', 'clean has no untracked launcher files')
  const cli = spawnSync(process.execPath, ['run.mjs'], { cwd: directory, encoding: 'utf8' })
  t.equal(cli.status, 0, 'source launcher runs from the dummy repository')
  t.match(cli.stdout, /No merge conflicts found/, 'launcher inspects the dummy repository')
  t.throws(() => createScenario('unknown', directory), /Choose a scenario/, 'unknown scenario does not reset')
  t.ok(existsSync(join(directory, 'run.mjs')), 'invalid scenario preserves existing dummy')

  const unrelated = join(temporary, 'unrelated')
  mkdirSync(unrelated)
  writeFileSync(join(unrelated, 'keep-me'), 'safe')
  t.throws(() => createScenario('clean', unrelated), /Refusing to reset/, 'unmarked folders are protected')
  t.equal(readFileSync(join(unrelated, 'keep-me'), 'utf8'), 'safe', 'unrelated files survive')
  t.end()
})

test('many scenario produces exactly 40 separate conflicts in ten files', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'zipper-many-'))
  t.teardown(() => rmSync(temporary, { recursive: true, force: true }))
  const cwd = createScenario('many', join(temporary, 'dummy'))
  const files = await getConflicts({ cwd })
  t.equal(files.length, 10, 'ten files are unmerged')
  t.ok(files.every((file) => file.error === null), 'every file parses successfully')
  t.deepEqual(files.map((file) => file.conflicts.length), [1, 1, 2, 2, 3, 3, 4, 6, 8, 10], 'Git keeps the intended blocks separate')
  t.equal(files.reduce((count, file) => count + file.conflicts.length, 0), 40)
  t.ok(existsSync(join(cwd, '.git/MERGE_HEAD')), 'leaves a real merge pending')
})
