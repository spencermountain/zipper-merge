import { execFile } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { parseConflicts } from './parse-conflicts.js'
import getConflicts from './conflicts.js'
import getBranches from './branches.js'

const runFile = promisify(execFile)


// Use the working tree's root name, even when called from a nested directory.
// This works for local repositories without a remote; Git errors propagate.
export const getRepoName = async (options = {}) => {
  const { stdout } = await runFile('git', ['rev-parse', '--show-toplevel'], options)
  return basename(stdout.replace(/\r?\n$/, ''))
}

export const getState = async (options = {}) => {
  const conflicts = await getConflicts(options)
  const repoName = await getRepoName(options)
  const branches = await getBranches(options)
  return { conflicts, repoName, branches }
}
