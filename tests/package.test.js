import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'tape'

test('packed CLI runs with only its declared runtime dependencies', (t) => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const directory = mkdtempSync(join(tmpdir(), 'zipper-package-'))
  t.teardown(() => rmSync(directory, { recursive: true, force: true }))
  const packed = JSON.parse(execFileSync('npm', [
    'pack', '--ignore-scripts', '--json', '--pack-destination', directory
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(directory, 'cache') } }))[0]
  t.deepEqual(packed.files.map(({ path }) => path).sort(), [
    'LICENSE', 'README.md', 'builds/index.js', 'package.json'
  ])
  execFileSync('tar', ['-xzf', join(directory, packed.filename), '-C', directory])
  const packageRoot = join(directory, 'package')
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  const entry = join(packageRoot, pkg.bin['zipper-merge'])
  t.match(readFileSync(entry, 'utf8'), /^#!\/usr\/bin\/env node\n/)
  t.equal(pkg.types, undefined)
  t.equal(pkg.dependencies.tsx, undefined)

  // Reuse installed production dependencies without exposing development tools.
  mkdirSync(join(packageRoot, 'node_modules'))
  for (const name of Object.keys(pkg.dependencies)) {
    symlinkSync(realpathSync(join(root, 'node_modules', name)), join(packageRoot, 'node_modules', name))
  }
  const cwd = join(directory, 'repo')
  mkdirSync(cwd)
  const run = () => spawnSync(process.execPath, [entry], { cwd, encoding: 'utf8' })
  const outside = run()
  t.equal(outside.status, 1)
  t.match(outside.stderr, /Git working tree/)

  execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd })
  const clean = run()
  t.equal(clean.status, 0, clean.stderr)
  t.match(clean.stdout, /No merge conflicts found/)

  const hash = execFileSync('git', ['hash-object', '-w', '--stdin'], {
    cwd, input: 'fixture\n', encoding: 'utf8'
  }).trim()
  execFileSync('git', ['update-index', '--index-info'], {
    cwd, input: `100644 ${hash} 1\tconflict.js\n100644 ${hash} 2\tconflict.js\n`
  })
  const conflicts = run()
  t.equal(conflicts.status, 1)
  t.match(conflicts.stderr, /interactive terminal/)
  t.end()
})
