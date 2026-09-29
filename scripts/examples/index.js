import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import simple from './simple.js'
import multi from './multi.js'
import multiStep from './multi-step.js'
import clean from './clean.js'

const scenarios = new Map([
  ['simple', simple],
  ['multi', multi],
  ['multi-step', multiStep],
  ['clean', clean]
])

// Validate before calling a scenario: an unknown name must never reset dummy/.
export const createScenario = (name, directory) => {
  const create = scenarios.get(name)
  if (!create) throw new Error(`Choose a scenario: ${[...scenarios.keys()].join(', ')}`)
  return create(directory)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const scenario = process.argv[2]
    const directory = createScenario(scenario)
    console.log(`Created ${scenario} dummy: ${directory}\n\nFrom this checkout:\n  pnpm --dir dummy dev\n\nOr cd into dummy and run:\n  pnpm dev\n  git status\n\nThe CLI loads the live source; no build or install is needed in dummy.`)
    if (scenario === 'multi-step') {
      console.log('\nResolve menu.txt, then git add menu.txt && git -c core.editor=true cherry-pick --continue.\nNext, resolve config/settings.json and continue again. Cancel with git cherry-pick --abort.')
    }
    console.log('\nEach conflict:* command deletes and recreates this dummy, including your edits.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
