import { execFile } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { parseConflicts } from './parse-conflicts.js'

const runFile = promisify(execFile)
// Each file includes its basename (filename), repo-relative path (relative),
// and full working-tree path (absolute). Files stay listed until staged, even
// after all markers are resolved. Per-file failures
// have empty arrays and error details; failures running Git reject the call.
const getConflicts = async (options = {}) => {
  const { stdout: rootOutput } = await runFile('git', ['rev-parse', '--show-toplevel'], options)
  const root = rootOutput.replace(/\r?\n$/, '')
  const { stdout } = await runFile(
    'git',
    ['diff', '--no-relative', '--name-only', '--diff-filter=U', '-z'],
    options
  )
  const files = stdout.split('\0').filter(Boolean)
  const entries = await Promise.all(
    files.map(async (file) => {
      const paths = { filename: basename(file), relative: file, absolute: join(root, file) }
      try {
        // Unmerged entries can be deleted files or symlinks, not just text files.
        // Do not follow a conflicted symlink and read an unrelated target.
        if (!(await lstat(paths.absolute)).isFile()) throw new Error('Not a regular file')
        const contents = await readFile(paths.absolute)
        if (contents.includes(0)) throw new Error('Binary file cannot be parsed as text')
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(contents)
        const sections = parseConflicts(text)
        return {
          ...paths,
          sections,
          conflicts: sections.filter((section) => section.type === 'conflict'),
          error: null
        }
      } catch (error) {
        // One unreadable or malformed file must not hide the other unmerged files.
        return {
          ...paths,
          sections: [],
          conflicts: [],
          error: {
            message: error.message,
            code: error.code ?? null,
            lineNumber: error.lineNumber ?? null
          }
        }
      }
    })
  )
  return entries
}

export default getConflicts
