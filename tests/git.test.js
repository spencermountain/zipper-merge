import test from 'tape'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createScenario } from '../scripts/examples/index.js'
import { getBranchNames, getState } from '../src/lib/git.js'

test('branch names use Git metadata without guessing incoming names', async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), 'zipper-branches-'))
  t.teardown(() => rmSync(temporary, { recursive: true, force: true }))
  const cwd = join(temporary, 'repo with spaces')
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  createScenario('clean', cwd)
  t.deepEqual(await getBranchNames({ cwd }), {
    current: 'main', operation: null, incoming: [], rebasing: null
  }, 'clean repository only has a current branch')

  createScenario('simple', cwd)
  const merge = await getBranchNames({ cwd: join(cwd, 'config') })
  t.equal(merge.current, 'main', 'works from a nested directory')
  t.equal(merge.operation, 'merge')
  t.deepEqual(merge.incoming, [{ commit: git('rev-parse', 'incoming'), branches: ['incoming'] }])
  git('branch', 'alias', 'incoming')
  t.deepEqual((await getBranchNames({ cwd })).incoming[0].branches, ['alias', 'incoming'], 'preserves ambiguous branch names')
  t.deepEqual((await getState({ cwd })).branches, await getBranchNames({ cwd }), 'state includes branch metadata')

  createScenario('multi-step', cwd)
  const cherryPick = await getBranchNames({ cwd })
  t.equal(cherryPick.operation, 'cherry-pick')
  t.equal(cherryPick.current, 'main')
  t.deepEqual(cherryPick.incoming, [{ commit: git('rev-parse', 'CHERRY_PICK_HEAD'), branches: [] }], 'non-tip commit has no invented branch name')

  createScenario('simple', cwd)
  git('merge', '--abort')
  try {
    git('rebase', 'incoming')
    t.fail('expected a rebase conflict')
  } catch (error) {
    t.equal(error.status, 1)
  }
  const rebase = await getBranchNames({ cwd })
  t.equal(rebase.current, null, 'rebase HEAD is detached')
  t.equal(rebase.rebasing, 'main', 'retains the branch being rebased')
  t.equal(rebase.operation, 'rebase')
  t.equal(rebase.incoming[0].commit, git('rev-parse', 'REBASE_HEAD'), 'identifies the replayed commit')
  git('rebase', '--abort')
  git('checkout', '--detach', '--quiet')
  const detached = await getBranchNames({ cwd })
  t.equal(detached.current, null)
  t.equal(detached.operation, null, 'detached HEAD alone is not a rebase')
})
