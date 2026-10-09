import test from 'tape'
import { snapshot } from 'valtio'
import { appState } from '../src/UI/store.js'

test('Valtio state supports direct mutation and keeps selection in bounds', (t) => {
  const reset = () => Object.assign(appState, { gitState: { conflicts: [] }, selected: 0 })
  reset()
  t.teardown(reset)
  appState.gitState = { conflicts: [{ relative: 'first.txt' }, { relative: 'second.txt' }] }
  appState.selected += 1
  t.equal(appState.selected, 1, 'supports direct updates')
  const before = snapshot(appState)
  t.equal(before.gitState.conflicts[before.selected].relative, 'second.txt')
  appState.gitState.conflicts.pop()
  t.equal(appState.selected, 0, 'nested array mutations immediately clamp selection')
  t.equal(before.selected, 1, 'existing snapshots remain unchanged')
  t.equal(before.gitState.conflicts.length, 2, 'existing snapshots preserve nested data')
  appState.selected = -1
  t.equal(appState.selected, 0, 'selection cannot move before the first file')
  appState.selected = 10
  t.equal(appState.selected, 0, 'selection cannot move beyond the last file')
  appState.gitState = { conflicts: [] }
  t.equal(appState.selected, 0, 'empty lists retain a valid default')
  reset()
  t.deepEqual(snapshot(appState), { gitState: { conflicts: [] }, selected: 0 }, 'tests can reset shared state')
  t.end()
})
