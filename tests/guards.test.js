import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'tape'
import {
  checkGitInstalled,
  checkGitRepository,
  checkGitBranch,
  checkGitEnvironment,
  checkInteractiveTerminal
} from '../src/lib/guards.js'

const rejects = async (t, promise, pattern) => {
  try {
    await promise
  } catch (error) {
    t.match(error.message, pattern)
    return
  }
  t.fail(`Expected rejection matching ${pattern}`)
}

test('Git preflight guards', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'zipper-guards-'))
  t.teardown(() => rmSync(directory, { recursive: true, force: true }))
  const cwd = join(directory, 'repo')
  mkdirSync(cwd)
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' })

  t.comment('missing Git produces an actionable error')
  await rejects(
    t,
    checkGitInstalled({ cwd, env: { ...process.env, PATH: directory } }),
    /Git is not installed or is not available on PATH/
  )

  t.comment('rejects a directory outside a repository')
  await rejects(t, checkGitEnvironment({ cwd }), /Git working tree/)

  t.comment('CLI reports preflight failures without a stack trace')
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url))
  const result = spawnSync(process.execPath, [entry], { cwd, encoding: 'utf8' })
  t.equal(result.status, 1)
  t.match(result.stderr, /zipper-merge: Run zipper-merge inside/)
  t.doesNotMatch(result.stderr, /\n\s+at /)

  git('init', '--quiet', '--initial-branch=main')
  t.comment('accepts an unborn branch and nested working directory')
  const nested = join(cwd, 'nested')
  mkdirSync(nested)
  t.equal(await checkGitEnvironment({ cwd: nested }), 'main')

  t.comment('rejects the .git directory and bare repositories')
  await rejects(t, checkGitRepository({ cwd: join(cwd, '.git') }), /working tree/)
  const bare = join(directory, 'bare.git')
  git('init', '--quiet', '--bare', bare)
  await rejects(t, checkGitEnvironment({ cwd: bare }), /bare repository/)

  t.comment('rejects detached HEAD')
  git('-c', 'user.name=Guard Test', '-c', 'user.email=guard@example.test',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
    'commit', '--quiet', '--allow-empty', '-m', 'fixture')
  git('checkout', '--quiet', '--detach')
  await rejects(t, checkGitBranch({ cwd }), /HEAD is detached/)
})

test('file selection requires terminal input and output', (t) => {
  t.doesNotThrow(() => checkInteractiveTerminal({ isTTY: true }, { isTTY: true }))
  t.throws(() => checkInteractiveTerminal({}, { isTTY: true }), /interactive terminal/)
  t.throws(() => checkInteractiveTerminal({ isTTY: true }, {}), /interactive terminal/)
  t.end()
})
