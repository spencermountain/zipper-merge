import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = mkdtempSync(join(tmpdir(), 'merge-conflict-demo-'))
const git = (...args) => {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8' })
  if (result.error) {
    throw result.error
  }
  return result
}
const run = (...args) => {
  const result = git(...args)
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Git command failed')
  }
  return result.stdout.trim()
}
const save = (drink, message) => {
  writeFileSync(join(directory, 'menu.txt'), `Breakfast menu\nDrink: ${drink}\nFood: toast\n`)
  run('add', 'menu.txt')
  run('commit', '-m', message)
}

run('init', '--initial-branch=main')
run('config', 'user.name', 'Merge Practice')
run('config', 'user.email', 'practice@example.invalid')
run('config', 'commit.gpgsign', 'false')
run('config', 'core.hooksPath', join(directory, 'unused-hooks'))
run('config', 'merge.conflictStyle', 'merge')
run('config', 'rerere.enabled', 'false')

save('water', 'Start with water')
run('switch', '-c', 'incoming')
save('coffee', 'Incoming branch wants coffee')
run('switch', 'main')
save('tea', 'Our branch wants tea')

// Leave the practice repository paused in a real, unresolved merge.
const merge = git('merge', '--no-ff', '--no-commit', 'incoming')
if (merge.status !== 1 || run('diff', '--name-only', '--diff-filter=U') !== 'menu.txt') {
  throw new Error(`Expected a conflict in menu.txt.\n${merge.stdout}\n${merge.stderr}`)
}

const quotedDirectory = "'" + directory.replaceAll("'", "'\\''") + "'"
console.log(`Practice repository created:\n\n  cd ${quotedDirectory}

There is one conflict in menu.txt:
  ours (main):       tea
  theirs (incoming): coffee

Try:
  git status
  git diff --name-only --diff-filter=U
  cat menu.txt

Edit menu.txt, choose a drink, and remove the conflict markers. Then:
  git add menu.txt
  git merge --continue

Or cancel the merge:
  git merge --abort

Run this script again anytime to create a fresh practice repository.`)
