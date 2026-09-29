import React from 'react'
import { Box, Text } from 'ink'
import Select from './Select.jsx'

const App = function ({ conflicts = [], clearPrompt }) {
  return (
    <Box flexDirection="column" width="100%" overflow="hidden" padding={1}>
      {conflicts.length > 0 ? (
        <Select
          title="Files with conflicts"
          description="Use ↑/↓ to choose a file, then press Enter"
          choices={conflicts.map((file) => ({ id: file, label: file }))}
          clearPrompt={clearPrompt}
        />
      ) : (
        <Text>No merge conflicts found.</Text>
      )}
    </Box>
  )
}

export default App
