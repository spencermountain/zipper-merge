import { create } from 'zustand'

export const useAppState = create(() => ({
  gitState: { conflicts: [] },
  selected: 0
}))

// Keep selection valid when a refresh removes files or a caller sets an index.
useAppState.subscribe(({ gitState, selected }) => {
  const lastIndex = (gitState.conflicts?.length ?? 0) - 1
  const next = Math.max(0, Math.min(selected, lastIndex))
  if (next !== selected) useAppState.setState({ selected: next })
})
