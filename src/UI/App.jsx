import React from 'react'
import { Box, Text } from 'ink'
import Select from './Select.jsx'
import Colors from './Colors.jsx'
import Header from './Header.jsx'
import StatusBox from './StatusBox.jsx'

const App = function ({ state = {}, clearPrompt }) {
  const { conflicts = {} } = state
  const files = Object.keys(conflicts)
  return (
    <Box width="100%" overflow="hidden" flexDirection="column">
      <Header />
      {files.length > 0 ? (
        <Box flexDirection="column" padding={1}>
          <StatusBox state={state} />
          <Select
            title={`${files.length} Current Files with conflicts`}
            description="Use ↑/↓ to choose a file, then press Enter"
            choices={files.map((file) => ({
              id: file,
              label: file,
              description: conflicts[file].error?.message
            }))}
            clearPrompt={clearPrompt}
          />
        </Box>
      ) : (
        <Text>No merge conflicts found.</Text>
      )}
    </Box>
  )
}

export default App
