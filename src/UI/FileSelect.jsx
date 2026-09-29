import React, { useRef } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { useAppState } from './AppState.jsx'

const Simple = function ({ clearPrompt }) {
  const state = useAppState((store) => store.state)
  const selected = useAppState((store) => store.selected)
  const setSelected = useAppState((store) => store.setSelected)
  const files = state.conflicts ?? []
  const search = useRef({ prefix: '', updatedAt: 0 })
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.escape) return // App handles Escape globally.
    if (key.ctrl && input === 'c') {
      exit(new Error('Selection cancelled'))
    } else if (key.upArrow) {
      search.current.prefix = ''
      setSelected((index) => (index - 1 + files.length) % files.length)
    } else if (key.downArrow) {
      search.current.prefix = ''
      setSelected((index) => (index + 1) % files.length)
    } else if (key.return) {
      clearPrompt()
      exit(files[selected].relative)
    } else if (input && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(input)) {
      const now = Date.now()
      const prefix = now - search.current.updatedAt > 700 ? '' : search.current.prefix
      search.current = { prefix: prefix + input.toLowerCase(), updatedAt: now }
      const match = files.findIndex((choice) =>
        choice.relative.toLowerCase().startsWith(search.current.prefix)
      )
      if (match !== -1) {
        setSelected(match)
      }
    }
  })
  return (
    <Box flexDirection="column" paddingTop={2} paddingBottom={2} paddingLeft={'2%'}>
      <Box flexDirection="row" alignItems="center" justifyContent="start">
        <Text color="red" dim>
          {files.length + ' Files'}
        </Text>
        <Text bold> to resolve:</Text>
      </Box>
      <Box
        flexDirection="column"
        borderTop={false}
        borderLeft={true}
        borderStyle="single"
        borderBottom={false}
        borderRight={false}
        borderColor="gray"
        paddingLeft={1}
        paddingTop={1}
      >
        {files.map((choice, index) => (
          <Box
            key={choice.relative}
            flexDirection="row"
            alignItems="center"
            justifyContent="start"
            gap={2}
            paddingLeft={1}
            minHeight={2}
          >
            {/* picker UI */}
            <Text color={index === selected ? 'cyan' : undefined}>
              {index === selected ? '●' : '○'}
            </Text>
            <Box flexDirection="col" height={3}>
              <Box flexDirection="row" justifyContent="start">
                <Text color="red" underline bold={index === selected}>
                  ./{choice.relative}
                </Text>
                <Text dimColor={index !== selected} color="white">
                  {' ❯'}
                </Text>
              </Box>
              <Box flexDirection="row" justifyContent="start" paddingLeft={3}>
                <Text color="white" dimColor>
                  ╰─
                </Text>
                <Text color="white" dimColor={index !== selected}>
                  {' ' + choice.conflicts.length}{' '}
                </Text>
                <Text color="white" dimColor={index !== selected}>
                  {choice.conflicts.length === 1 ? 'conflict' : 'conflicts'}
                </Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Text dimColor>{selected}</Text>
    </Box>
  )
}

// export default singleSelect
export default Simple
