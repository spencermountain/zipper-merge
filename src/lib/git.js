import { execFile } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { parseConflicts } from './parse-conflicts.js'

const runFile = promisify(execFile)

// Map repo-relative filenames to { sections, conflicts, error }. Files stay in
// the map until staged, even after all markers are resolved. Per-file failures
// have empty arrays and error details; failures running Git reject the call.
export const getConflicts = async (options = {}) => {
  const { stdout: rootOutput } = await runFile('git', ['rev-parse', '--show-toplevel'], options)
  const root = rootOutput.replace(/\r?\n$/, '')
  const { stdout } = await runFile(
    'git', ['diff', '--no-relative', '--name-only', '--diff-filter=U', '-z'], options
  )
  const files = stdout.split('\0').filter(Boolean)
  const entries = await Promise.all(files.map(async (file) => {
    try {
      const path = join(root, file)
      // Unmerged entries can be deleted files or symlinks, not just text files.
      // Do not follow a conflicted symlink and read an unrelated target.
      if (!(await lstat(path)).isFile()) throw new Error('Not a regular file')
      const contents = await readFile(path)
      if (contents.includes(0)) throw new Error('Binary file cannot be parsed as text')
      const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(contents)
      const sections = parseConflicts(text)
      return [file, {
        sections,
        conflicts: sections.filter((section) => section.type === 'conflict'),
        error: null
      }]
    } catch (error) {
      // One unreadable or malformed file must not hide the other unmerged files.
      return [file, {
        sections: [], conflicts: [],
        error: { message: error.message, code: error.code ?? null, lineNumber: error.lineNumber ?? null }
      }]
    }
  }))
  return Object.fromEntries(entries)
}

// Use the working tree's root name, even when called from a nested directory.
// This works for local repositories without a remote; Git errors propagate.
export const getRepoName = async (options = {}) => {
  const { stdout } = await runFile('git', ['rev-parse', '--show-toplevel'], options)
  return basename(stdout.replace(/\r?\n$/, ''))
}

// Git records incoming commits, not necessarily the branch names used to start
// an operation. Return every local branch whose tip matches, rather than guess.
// `current` is null for detached HEAD; `rebasing` names the branch being rebased.
export const getBranchNames = async (options = {}) => {
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

export const getState = async (options = {}) => {
  const conflicts = await getConflicts(options)
  const repoName = await getRepoName(options)
  const branches = await getBranchNames(options)
  return { conflicts, repoName, branches }
}
