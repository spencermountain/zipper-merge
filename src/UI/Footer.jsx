import React from 'react'
import { Box, Text } from 'ink'

const Footer = ({ hasConflicts = false }) => (
  <Box height={1} flexShrink={0} paddingX={1} overflow="hidden">
    <Text dimColor wrap="truncate-end">
      {hasConflicts ? 'Esc exit · ↑/↓ choose file · Enter select' : 'Esc exit'}
    </Text>
  </Box>
)

export default Footer
