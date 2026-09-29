import React from 'react'
import { Box, Text } from 'ink'
import version from '../_version.js'
import Link from 'ink-link'

const StatusBox = function ({ state }) {
  const { repoName } = state
  console.log(state)
  return (
    <Box
      flexDirection="column"
      alignSelf="start"
      marginLeft={'15%'}
      width="30"
      flexShrink={1}
      minHeight="30"
      borderStyle="round"
      borderColor="grey"
      backgroundDimColor="red"
    >
      <Box alignSelf="start">
        <Text color="yellow"> {repoName}</Text>
        <Text color="cyan"> {'/' + state.branches.current}</Text>
      </Box>
      <Box alignSelf="start" padding={1}>
        <Text color="whiteDim">Currently in a merge conflict</Text>
      </Box>
    </Box>
  )
}

export default StatusBox
