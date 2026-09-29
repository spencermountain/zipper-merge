import { createStore } from 'zustand/vanilla'

// Update selection and its derived file together, including after a Git refresh.
const selection = (state, index) => {
  const files = state.conflicts ?? []
  const selected = Math.max(0, Math.min(index, files.length - 1))
  return { selected, selectedFile: files[selected] ?? null }
}

// Create one store per app instance so separate renders/tests never share state.
// Add future shared variables and actions here. Search prefixes stay local to UI.
export const createAppStore = (initialState = {}) => createStore((set) => ({
  state: initialState,
  ...selection(initialState, 0),
  setState: (update) => set((current) => {
    const state = typeof update === 'function' ? update(current.state) : update
    return { state, ...selection(state, current.selected) }
  }),
  setSelected: (update) => set((current) => {
    const index = typeof update === 'function' ? update(current.selected) : update
    return selection(current.state, index)
  })
}))
