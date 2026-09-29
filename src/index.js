import { createElement } from 'react'
import { render } from 'ink'
import { register } from 'tsx/esm/api'
import { checkGitEnvironment, checkInteractiveTerminal, getConflicts } from './lib/index.js'

try {
  await checkGitEnvironment()
  const conflicts = await getConflicts()
  if (conflicts.length > 0) checkInteractiveTerminal()

  register()
  const { default: App } = await import('./UI/App.jsx')
  const app = render(createElement(App, { conflicts, clearPrompt: () => app.clear() }))
} catch (error) {
  console.error(`zipper-merge: ${error.message}`)
  process.exitCode = 1
}
