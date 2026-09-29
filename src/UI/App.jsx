import React from 'react'
import { Box, Text, useApp, useInput, useStdin, useWindowSize } from 'ink'
import FileSelect from './FileSelect.jsx'
import Colors from './Colors.jsx'
import Header from './Header.jsx'
import StatusBox from './StatusBox.jsx'
import Footer from './Footer.jsx'

const App = function ({ state = {}, clearPrompt }) {
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
    <Box width="100%" height={rows} overflow="hidden" flexDirection="column">
      <Box flexDirection="column" flexGrow={1} flexShrink={1} minHeight={0} overflow="hidden">
        <Header />
        {files.length > 0 ? (
          <Box flexDirection="column" padding={1}>
            <StatusBox state={state} />
            <FileSelect files={files} clearPrompt={clearPrompt} />
          </Box>
        ) : (
          <Text>No merge conflicts found.</Text>
        )}
      </Box>
      <Footer hasConflicts={files.length > 0} />
    </Box>
  )
}

export default App
