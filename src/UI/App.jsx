import React from 'react'
import { Box, Text, useApp, useInput, useStdin, useWindowSize } from 'ink'
import FileSelect from './FileSelect.jsx'
import Header from './Header.jsx'
import StatusBox from './StatusBox.jsx'
import Footer from './Footer.jsx'
import { AppStateProvider, useAppState } from './AppState.jsx'

const AppContent = function ({ clearPrompt, mouseEnabled }) {
  const state = useAppState((store) => store.state)
  const { exit } = useApp()
  const { isRawModeSupported } = useStdin()
  const { rows } = useWindowSize()
  useInput(
    (input, key) => {
      if (key.escape) {
        clearPrompt?.()
        exit()
      }
    },
    { isActive: isRawModeSupported }
  )
  const { conflicts: files = [] } = state
  return (
    <Box width="100%" maxHeight={mouseEnabled ? rows : undefined} overflow="hidden" flexDirection="column">
      <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
        <Header />
        {files.length > 0 ? (
          <Box flexDirection="column" padding={1}>
            <StatusBox />
            <FileSelect clearPrompt={clearPrompt} mouseEnabled={mouseEnabled} />
          </Box>
        ) : (
          <Text>No merge conflicts found.</Text>
        )}
      </Box>
      <Footer />
    </Box>
  )
}

const App = ({ state, clearPrompt, mouseEnabled = false }) => (
  <AppStateProvider initialState={state}>
    <AppContent clearPrompt={clearPrompt} mouseEnabled={mouseEnabled} />
  </AppStateProvider>
)

export default App
