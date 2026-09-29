import React from 'react'
import { Box, Text } from 'ink'
import { useAppState } from './AppState.jsx'

const StatusBox = function () {
  const state = useAppState((store) => store.state)
  const { repoName } = state
  const incomingName = state.branches.incoming
    .map((branch) => {
      return branch.branches.join(' ')
    })
    .join(' / ')
  return (
    <Box
      flexDirection="column"
      alignSelf="start"
      marginLeft={'5%'}
      width="30"
      flexShrink={1}
      maxHeight="16"
      borderStyle="round"
      borderColor="grey"
      backgroundDimColor="red"
    >
      <Box alignSelf="start" paddingLeft={1}>
        <Text color="yellow"> {repoName}</Text>
        <Text color="cyan"> {'/' + state.branches.current}</Text>
      </Box>
      <Box alignSelf="start" padding={1} italic>
        <Text color="yellow" bold>
          {' ↯ '}
        </Text>
        <Text color="whiteDim">Currently in a merge conflict</Text>
      </Box>
      <Box
        flexDirection="row"
        alignSelf="end"
        justifyContent="flex-end"
        width="100%"
        paddingRight={1}
      >
        <Text color="magenta" dim>
          {' ↯ '}
          {incomingName}
        </Text>
      </Box>
    </Box>
  )
}

export default StatusBox
