import React, { createContext, useContext, useState } from 'react'
import { useStore } from 'zustand'
import { createAppStore } from './store.js'

const AppStateContext = createContext(null)

// Context carries a stable store reference; Zustand handles reactive updates.
export const AppStateProvider = ({ initialGitState = {}, children }) => {
  const [store] = useState(() => createAppStore(initialGitState))

  return <AppStateContext.Provider value={store}>{children}</AppStateContext.Provider>
}

// Prefer selectors: useAppState((store) => store.selected).
// Without a selector, this subscribes to the full store for compatibility.
export const useAppState = (selector) => {
  const store = useContext(AppStateContext)
  if (!store) throw new Error('useAppState must be used inside AppStateProvider')
  return useStore(store, selector)
}
