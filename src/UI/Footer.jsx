import React from 'react'
import { Box, Text } from 'ink'
import { useSnapshot } from 'valtio'
import { appState } from './store.js'

const Footer = () => {
  const { gitState, selected } = useSnapshot(appState)
  const conflicts = gitState.conflicts?.length ?? 0
  let message = ''
  if (conflicts > 0) {
    message = ` ${conflicts} file${conflicts > 1 ? 's' : ''} to resolve before continuing`
  } else {
    message = 'Esc exit'
  }
  return (
    <Box height={1} flexShrink={0} paddingX={1} overflow="hidden">
      <Text dimColor wrap="truncate-end">
        ⟫⟫{message}
      </Text>
    </Box>
  )
}
export default Footer
