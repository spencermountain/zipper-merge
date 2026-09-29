import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
// Git records incoming commits, not necessarily the branch names used to start
// an operation. Return every local branch whose tip matches, rather than guess.
// `current` is null for detached HEAD; `rebasing` names the branch being rebased.
export const getBranches = async (options = {}) => {
  const git = async (...args) => {
    const { stdout } = await runFile('git', args, options)
    return stdout.trim()
  }
  const optionalRef = async (...args) => {
    try {
      return await git(...args)
    } catch (error) {
      if (error.code === 1) return null
      throw error
    }
  }
  // --git-path resolves metadata correctly in linked worktrees as well.
  const metadata = async (name) => {
    const path = await git('rev-parse', '--path-format=absolute', '--git-path', name)
    try {
      return (await readFile(path, 'utf8')).trim()
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  const current = await optionalRef('symbolic-ref', '--quiet', '--short', 'HEAD')
  const rebaseHead =
    (await metadata('rebase-merge/head-name')) ?? (await metadata('rebase-apply/head-name'))
  const mergeHeads = await metadata('MERGE_HEAD')
  const cherryPickHead = await optionalRef('rev-parse', '--verify', '--quiet', 'CHERRY_PICK_HEAD')
  let operation = null
  let commits = []
  if (rebaseHead !== null) {
    operation = 'rebase'
    const commit = await optionalRef('rev-parse', '--verify', '--quiet', 'REBASE_HEAD')
    if (commit) commits = [commit]
  } else if (mergeHeads) {
    operation = 'merge'
    commits = mergeHeads.split(/\s+/)
  } else if (cherryPickHead) {
    operation = 'cherry-pick'
    commits = [cherryPickHead]
  }
  const incoming = await Promise.all(
    commits.map(async (commit) => {
      const refs = await git(
        'for-each-ref',
        `--points-at=${commit}`,
        '--format=%(refname)',
        'refs/heads/'
      )
      const branches = refs
        .split('\n')
        .filter(Boolean)
        .map((ref) => ref.slice('refs/heads/'.length))
      return { commit, branches }
    })
  )
  const rebasing = rebaseHead?.startsWith('refs/heads/')
    ? rebaseHead.slice('refs/heads/'.length)
    : null
  return { current, operation, incoming, rebasing }
}
export default getBranches
