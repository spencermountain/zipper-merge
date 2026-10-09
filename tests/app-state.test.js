import test from 'tape'
import { useSnapshot } from 'valtio'
import { PassThrough } from 'node:stream'
import { stripVTControlCharacters } from 'node:util'
import React from 'react'
import { render } from 'ink'
import { register } from 'tsx/esm/api'

// Load the same uncompiled JSX used by the development CLI.
register()
const { appState } = await import('../src/UI/store.js')
const { default: FileSelect } = await import('../src/UI/FileSelect.jsx')
const { default: Footer } = await import('../src/UI/Footer.jsx')

test('app store shares selection and repository updates across components', async (t) => {
  const stdin = new PassThrough()
  stdin.isTTY = true
  stdin.setRawMode = stdin.ref = stdin.unref = () => {}
  const stdout = new PassThrough()
  stdout.columns = 100
  stdout.rows = 40
  let output = ''
  stdout.on('data', (chunk) => { output += stripVTControlCharacters(chunk.toString()) })
  let shared
  const Observer = () => {
    const state = useSnapshot(appState)
    // Read during render so Valtio tracks the fields this observer watches.
    shared = { selected: state.selected, gitState: { ...state.gitState } }
    return null
  }
  const initialGitState = {
    repoName: 'dummy',
    conflicts: ['alpha.txt', 'beta.txt'].map((relative) => ({ relative, conflicts: [], error: null }))
  }
  let cleared = false
  Object.assign(appState, { gitState: initialGitState, selected: 0 })
  t.teardown(() => Object.assign(appState, { gitState: { conflicts: [] }, selected: 0 }))
  const app = render(
    React.createElement(React.Fragment, null,
      React.createElement(Observer),
      React.createElement(FileSelect, { clearPrompt: () => { cleared = true } }),
      React.createElement(Footer)
    ),
    { stdin, stdout, stderr: stdout, debug: true, interactive: true }
  )
  t.teardown(() => { app.unmount(); app.cleanup() })
  const exited = app.waitUntilExit()
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
    await app.waitUntilRenderFlush()
  }
  await settle()
  t.equal(shared.selected, 0)
  t.equal(shared.gitState.conflicts[shared.selected].relative, 'alpha.txt')
  output = ''
  stdin.write('\u001b[B')
  await settle()
  t.equal(shared.selected, 1, 'keyboard navigation changes shared selection')
  t.equal(shared.gitState.conflicts[shared.selected].relative, 'beta.txt', 'selectedFile is derived from current state')
  t.match(output, /2 files to resolve before continuing/, 'Footer remains visible during selection')
  output = ''
  stdin.write('a')
  await settle()
  t.equal(shared.selected, 0, 'prefix selection updates the store too')
  t.match(output, /2 files to resolve before continuing/)
  appState.gitState = { ...appState.gitState, repoName: 'updated' }
  await settle()
  t.equal(shared.gitState.repoName, 'updated', 'repository state can be updated through the store')
  t.equal(initialGitState.repoName, 'dummy', 'initial state remains unchanged')
  stdin.write('\r')
  t.equal(await exited, 'alpha.txt', 'Enter uses the shared selected file')
  t.ok(cleared, 'selection still clears the prompt')
})
