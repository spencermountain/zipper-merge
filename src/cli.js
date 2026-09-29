import { createElement } from 'react'
import { render } from 'ink'
import App from './UI/App.jsx'
import { checkGitEnvironment } from './lib/guards.js'
import { getState } from './lib/git.js'

try {
  await checkGitEnvironment()
  const state = await getState()
  if (Object.keys(state.conflicts).length === 0) {
    console.log('No conflicts found.')
    process.exitCode = 0
  }
  const app = render(createElement(App, { state, clearPrompt: () => app.clear() }))
} catch (error) {
  console.error(`zipper-merge: ${error.message}`)
  process.exitCode = 1
}
