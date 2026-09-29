import { promisify } from 'util'
import { exec } from 'child_process'

export const runCmd = promisify(exec)

export const getConflicts = async () => {
  const cmd = `git diff --name-only --diff-filter=U -z |  jq -Rs 'split("\u0000") | map(select(length > 0))'`
  const { stdout } = await runCmd(cmd)
  return stdout
}
