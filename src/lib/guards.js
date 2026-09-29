import { promisify } from 'util'
import { exec, execFile } from 'child_process'

const runFile = promisify(execFile)

export const checkGitInstalled = async (options = {}) => {
  try {
    await runFile('git', ['--version'], options)
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Git is not installed or is not available on PATH.')
    }
    throw new Error(`Unable to run Git: ${error.message}`)
  }
}

export const checkGitRepository = async (options = {}) => {
  let stdout
  try {
    const result = await runFile('git', ['rev-parse', '--is-inside-work-tree'], options)
    stdout = result.stdout
  } catch (error) {
    throw new Error(
      `Run zipper-merge inside an accessible Git working tree. ${error.stderr?.trim() || error.message}`
    )
  }
  if (stdout.trim() !== 'true') {
    throw new Error(
      'Run zipper-merge inside a Git working tree, not a bare repository or .git directory.'
    )
  }
}

export const checkGitBranch = async (options = {}) => {
  try {
    const { stdout } = await runFile('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], options)
    return stdout.trim()
  } catch (error) {
    if (error.code === 1) {
      throw new Error('HEAD is detached. Switch to a Git branch before running zipper-merge.')
    }
    throw new Error(
      `Unable to determine the current Git branch: ${error.stderr?.trim() || error.message}`
    )
  }
}

const checkInteractiveTerminal = (stdin = process.stdin, stdout = process.stdout) => {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      'File selection requires an interactive terminal. Run zipper-merge without piping input or output.'
    )
  }
}

export const checkGitEnvironment = async (options = {}) => {
  await checkGitInstalled(options)
  await checkGitRepository(options)
  checkInteractiveTerminal()
  return await checkGitBranch(options)
}

