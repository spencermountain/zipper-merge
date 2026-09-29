import test from 'tape'
import { useAppState } from '../src/UI/store.js'

test('shared Zustand store keeps selection in bounds and can be reset', (t) => {
  useAppState.setState(useAppState.getInitialState(), true)
  t.teardown(() => useAppState.setState(useAppState.getInitialState(), true))
  const files = [{ relative: 'first.txt' }, { relative: 'second.txt' }]
  useAppState.setState({ gitState: { conflicts: files } })
  useAppState.setState(({ selected }) => ({ selected: selected + 1 }))
  t.equal(useAppState.getState().selected, 1, 'supports functional updates')
  t.equal(useAppState.getState().gitState.conflicts[1], files[1], 'selected file comes from gitState')
  useAppState.setState({ gitState: { conflicts: files.slice(0, 1) } })
  t.equal(useAppState.getState().selected, 0, 'refresh clamps selection to remaining files')
  useAppState.setState({ selected: -1 })
  t.equal(useAppState.getState().selected, 0, 'selection cannot move before the first file')
  useAppState.setState({ selected: 10 })
  t.equal(useAppState.getState().selected, 0, 'selection cannot move beyond the last file')
  useAppState.setState({ gitState: { conflicts: [] } })
  t.equal(useAppState.getState().selected, 0, 'empty lists retain a valid default')
  useAppState.setState(useAppState.getInitialState(), true)
  t.deepEqual(useAppState.getState(), { gitState: { conflicts: [] }, selected: 0 }, 'reset clears shared state between tests')
  t.end()
})
