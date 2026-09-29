import { createElement } from 'react'
import { render } from 'ink'
import App from './UI/App.jsx'
import { useAppState } from './UI/store.js'
import { checkGitEnvironment, checkInteractiveTerminal } from './lib/guards.js'
import { getState } from './lib/git.js'

try {
  await checkGitEnvironment()
  const gitState = await getState()
  useAppState.setState({ gitState, selected: 0 })
  if (gitState.conflicts.length === 0) {
    console.log('No merge conflicts found.')
  } else {
    checkInteractiveTerminal()
    const app = render(
      createElement(App, { clearPrompt: () => app.clear(), mouseEnabled: true }),
      { alternateScreen: false }
    )
  }
} catch (error) {
  console.error(`zipper-merge: ${error.message}`)
  process.exitCode = 1
}
