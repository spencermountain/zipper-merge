import { createStore } from 'zustand/vanilla'

// Update selection and its derived file together, including after a Git refresh.
const selection = (gitState, index) => {
  const files = gitState.conflicts ?? []
  const selected = Math.max(0, Math.min(index, files.length - 1))
  return { selected, selectedFile: files[selected] ?? null }
}

// Create one store per app instance so separate renders/tests never share gitState.
// Add future shared variables and actions here. Search prefixes stay local to UI.
export const createAppStore = (initialGitState = {}) => createStore((set) => ({
  gitState: initialGitState,
  ...selection(initialGitState, 0),
  setGitState: (update) => set((current) => {
    const gitState = typeof update === 'function' ? update(current.gitState) : update
    return { gitState, ...selection(gitState, current.selected) }
  }),
  setSelected: (update) => set((current) => {
    const index = typeof update === 'function' ? update(current.selected) : update
    return selection(current.gitState, index)
  })
}))
