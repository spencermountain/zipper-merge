import test from 'tape'
import { createAppStore } from '../src/UI/store.js'

test('Zustand stores isolate app instances and keep selection consistent', (t) => {
  const files = [{ relative: 'first.txt' }, { relative: 'second.txt' }]
  const first = createAppStore({ conflicts: files })
  const second = createAppStore({ conflicts: files })
  first.getState().setSelected((index) => index + 1)
  t.equal(first.getState().selectedFile, files[1])
  t.equal(second.getState().selected, 0, 'another app retains its selection')
  first.getState().setGitState((gitState) => ({ ...gitState, conflicts: files.slice(0, 1) }))
  t.equal(first.getState().selected, 0, 'selection stays in bounds after refreshing files')
  t.equal(first.getState().selectedFile, files[0])
  first.getState().setGitState({ conflicts: [] })
  t.equal(first.getState().selectedFile, null, 'empty lists have no selected file')
  t.equal(first.getState().selected, 0)
  t.equal(second.getState().gitState.conflicts.length, 2, 'another app retains its repository state')
  t.end()
})
