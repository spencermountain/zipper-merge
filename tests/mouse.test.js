import test from 'tape'
import React from 'react'
import { PassThrough } from 'node:stream'
import { stripVTControlCharacters } from 'node:util'
import { Box, render } from 'ink'
import { register } from 'tsx/esm/api'

register()
const { AppStateProvider, useAppState } = await import('../src/UI/AppState.jsx')
const { default: FileSelect } = await import('../src/UI/FileSelect.jsx')

test('mouse clicks confirm measured rows using the Enter action', async (t) => {
  const stdin = new PassThrough()
  stdin.isTTY = true
  stdin.setRawMode = stdin.ref = stdin.unref = () => {}
  const stdout = new PassThrough()
  stdout.isTTY = true
  stdout.columns = 100
  stdout.rows = 40
  let raw = ''
  let frame = ''
  stdout.on('data', (chunk) => {
    raw += chunk.toString()
    if (chunk.toString().includes('./beta.txt')) frame = stripVTControlCharacters(chunk.toString())
  })
  let shared
  const Observer = () => { shared = useAppState(); return null }
  const initialState = {
    conflicts: ['alpha.txt', 'beta.txt'].map((relative) => ({ relative, conflicts: [] }))
  }
  let cleared = 0
  const app = render(React.createElement(AppStateProvider, { initialState },
    React.createElement(Observer),
    React.createElement(Box, { paddingTop: 2, paddingLeft: 4 },
      React.createElement(FileSelect, { mouseEnabled: true, clearPrompt: () => { cleared += 1 } })
    )
  ), { stdin, stdout, stderr: stdout, debug: true, interactive: true })
  t.teardown(() => { app.unmount(); app.cleanup() })
  const exited = app.waitUntilExit()
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50))
  await settle()
  t.ok(raw.includes('\u001b[?1000h\u001b[?1006h'), 'enables SGR button reporting')
  const betaLine = frame.split('\n').findIndex((line) => line.includes('./beta.txt'))
  const click = (button, y, suffix = 'M') => stdin.write(`\u001b[<${button};10;${y}${suffix}`)
  click(0, 1)
  await settle()
  t.equal(shared.selected, 0, 'click outside rows does nothing')
  stdin.write('a')
  await settle()
  t.equal(shared.selected, 0, 'keyboard search still works after a mouse report')
  for (const [button, suffix] of [[2, 'M'], [64, 'M'], [0, 'm']]) {
    click(button, betaLine + 1, suffix)
    await settle()
    t.equal(shared.selected, 0, 'ignores right click, wheel, and release')
  }
  stdout.columns = 60
  stdout.emit('resize')
  await settle()
  const resizedLine = frame.split('\n').findIndex((line) => line.includes('./beta.txt'))
  t.equal(cleared, 0, 'ignored mouse reports do not confirm a selection')
  click(0, resizedLine + 1)
  t.equal(await exited, 'beta.txt', 'click confirms the clicked file immediately, even when another row was selected')
  t.equal(cleared, 1, 'click clears the prompt exactly once, like Enter')
  t.ok(raw.includes('\u001b[?1000l\u001b[?1006l'), 'restores normal mouse behavior on exit')
})

test('ClickableColumn calls back with an index without imposing a selection action', async (t) => {
  const { default: ClickableColumn } = await import('../src/UI/ClickableColumn.jsx')
  const { Text } = await import('ink')
  const stdin = new PassThrough()
  stdin.isTTY = true
  stdin.setRawMode = stdin.ref = stdin.unref = () => {}
  const stdout = new PassThrough()
  stdout.isTTY = true
  stdout.columns = 80
  stdout.rows = 24
  stdout.on('data', () => {})
  const clicked = []
  const content = (enabled) => React.createElement(ClickableColumn, {
    enabled, onClick: (index) => clicked.push(index)
  },
  React.createElement(Box, { height: 2 }, React.createElement(Text, null, 'First')),
  React.createElement(Box, { height: 3 }, React.createElement(Text, null, 'Second')))
  const app = render(content(true), { stdin, stdout, stderr: stdout, debug: true, interactive: true })
  t.teardown(() => { app.unmount(); app.cleanup() })
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50))
  await settle()
  stdin.write('\u001b[<0;1;4M')
  await settle()
  stdin.write('\u001b[<0;1;1M')
  await settle()
  t.deepEqual(clicked, [1, 0], 'returns the direct-child index for variable-height items')
  app.rerender(content(false))
  await settle()
  stdin.write('\u001b[<0;1;4M')
  await settle()
  t.deepEqual(clicked, [1, 0], 'disabled column does not invoke the callback')
})
