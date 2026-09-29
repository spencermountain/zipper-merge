import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  checkGitInstalled,
  checkGitRepository,
  checkGitBranch,
  checkGitEnvironment,
  checkInteractiveTerminal
} from '../src/lib/index.js'

test('Git preflight guards', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'zipper-guards-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const cwd = join(directory, 'repo')
  mkdirSync(cwd)
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

  await t.test('missing Git produces an actionable error', async () => {
    await assert.rejects(
      checkGitInstalled({ cwd, env: { ...process.env, PATH: directory } }),
      /Git is not installed or is not available on PATH/
    )
  })

  await t.test('rejects a directory outside a repository', async () => {
    await assert.rejects(checkGitEnvironment({ cwd }), /Git working tree/)
  })

  await t.test('CLI reports preflight failures without a stack trace', () => {
    const entry = fileURLToPath(new URL('../src/index.js', import.meta.url))
    const result = spawnSync(process.execPath, [entry], { cwd, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /zipper-merge: Run zipper-merge inside/)
    assert.doesNotMatch(result.stderr, /\n\s+at /)
  })

  git('init', '--quiet', '--initial-branch=main')
  await t.test('accepts an unborn branch and nested working directory', async () => {
    const nested = join(cwd, 'nested')
    mkdirSync(nested)
    assert.equal(await checkGitEnvironment({ cwd: nested }), 'main')
  })

  await t.test('rejects the .git directory and bare repositories', async () => {
    await assert.rejects(checkGitRepository({ cwd: join(cwd, '.git') }), /working tree/)
    const bare = join(directory, 'bare.git')
    git('init', '--quiet', '--bare', bare)
    await assert.rejects(checkGitEnvironment({ cwd: bare }), /bare repository/)
  })

  await t.test('rejects detached HEAD', async () => {
    git('-c', 'user.name=Guard Test', '-c', 'user.email=guard@example.test',
      '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
      'commit', '--quiet', '--allow-empty', '-m', 'fixture')
    git('checkout', '--quiet', '--detach')
    await assert.rejects(checkGitBranch({ cwd }), /HEAD is detached/)
  })
})

test('selection requires terminal input and output', () => {
  assert.doesNotThrow(() => checkInteractiveTerminal({ isTTY: true }, { isTTY: true }))
  assert.throws(() => checkInteractiveTerminal({}, { isTTY: true }), /interactive terminal/)
  assert.throws(() => checkInteractiveTerminal({ isTTY: true }, {}), /interactive terminal/)
})
