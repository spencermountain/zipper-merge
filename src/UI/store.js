import { proxy, subscribe } from 'valtio'

// Read with useSnapshot(appState) in components; write directly to this proxy.
export const appState = proxy({
  gitState: { conflicts: [] },
  selected: 0
})

// Clamp immediately, including when files are removed with an array mutation.
subscribe(appState, () => {
  const lastIndex = (appState.gitState.conflicts?.length ?? 0) - 1
  const selected = Math.max(0, Math.min(appState.selected, lastIndex))
  if (selected !== appState.selected) appState.selected = selected
}, true)
