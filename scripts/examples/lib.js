import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../../', import.meta.url))
// Retain the original marker so previously created dummy folders can still be reset.
const marker = '.zipper-playground'
const markerContents = 'Disposable zipper-merge conflict playground\n'

// Reset only a marked dummy repository, leaving the parent checkout untouched.
export const createDummy = (directory = join(root, 'dummy')) => {
  if (existsSync(directory)) {
    const markerPath = join(directory, marker)
    if (lstatSync(directory).isSymbolicLink() || !existsSync(markerPath) ||
        readFileSync(markerPath, 'utf8') !== markerContents) {
      throw new Error(`Refusing to reset an unrecognized dummy: ${directory}`)
    }
    rmSync(directory, { recursive: true, force: true })
  }
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, marker), markerContents)

  // Ignore inherited Git overrides and personal configuration in this disposable repo.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')))
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_EDITOR: 'true' })
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: directory, env, encoding: 'utf8' })
    if (result.error) throw result.error
    return result
  }
  // Most Git commands must succeed; conflict-producing commands use expectConflict below.
  const run = (...args) => {
    const result = git(...args)
    if (result.status !== 0) throw new Error(result.stderr || result.stdout)
    return result.stdout.trim()
  }
  const save = (file, content) => {
    mkdirSync(dirname(join(directory, file)), { recursive: true })
    writeFileSync(join(directory, file), content + '\n')
  }
  const commit = (message) => {
    run('add', '.')
    run('commit', '--quiet', '-m', message)
    return run('rev-parse', 'HEAD')
  }
  run('init', '--quiet', '--initial-branch=main', '--template=')
  run('config', 'user.name', 'Conflict Dummy')
  run('config', 'user.email', 'dummy@example.invalid')
  run('config', 'commit.gpgsign', 'false')
  run('config', 'core.hooksPath', join(directory, '.disabled-hooks'))
  run('config', 'rerere.enabled', 'false')
  run('config', 'merge.conflictStyle', 'merge')
  // This launcher loads the live source while keeping Git commands inside dummy/.
  save('package.json', JSON.stringify({
    name: 'zipper-merge-dummy', private: true, type: 'module',
    scripts: { dev: 'node run.mjs', watch: 'node --watch --watch-preserve-output run.mjs' }
  }, null, 2))
  save('run.mjs', `import ${JSON.stringify(new URL('../../src/index.js', import.meta.url).href)}`)

  // Exit code 1 is expected for a merge/cherry-pick that leaves unmerged files.
  const expectConflict = (...args) => {
    const operation = git(...args)
    const conflicts = run('diff', '--name-only', '--diff-filter=U')
    if (operation.status !== 1 || !conflicts) {
      throw new Error(`Expected conflicts. ${operation.stderr}\n${operation.stdout}`)
    }
  }
  return { directory, run, save, commit, expectConflict }
}
