import React, { useRef, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import { Row } from './_lib.jsx'

const Simple = function ({ title, description, choices, clearPrompt }) {
  const [selected, setSelected] = useState(0)
  const search = useRef({ prefix: '', updatedAt: 0 })
  const { exit } = useApp()

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit(new Error('Selection cancelled'))
    } else if (key.upArrow) {
      search.current.prefix = ''
      setSelected((index) => (index - 1 + choices.length) % choices.length)
    } else if (key.downArrow) {
      search.current.prefix = ''
      setSelected((index) => (index + 1) % choices.length)
    } else if (key.return) {
      clearPrompt()
      exit(choices[selected].id)
    } else if (input && !key.ctrl && !key.meta && !/[\u0000-\u001f\u007f]/.test(input)) {
      const now = Date.now()
      const prefix = now - search.current.updatedAt > 700 ? '' : search.current.prefix
      search.current = { prefix: prefix + input.toLowerCase(), updatedAt: now }
      const match = choices.findIndex((choice) =>
        choice.label.toLowerCase().startsWith(search.current.prefix)
      )
      if (match !== -1) setSelected(match)
    }
  })

  return (
    <Box flexDirection="column" paddingTop={2} paddingBottom={2} paddingLeft={1}>
      <Box flexDirection="row" alignItems="center" justifyContent="start" gap={3}>
        <Text bold>{title || ''}</Text>
        <Text dimColor>{description || ''}</Text>
      </Box>
      <Box
        flexDirection="column"
        borderTop={false}
        borderBottom={false}
        borderRight={false}
        borderColor="gray"
        paddingLeft={1}
      >
        {choices.map((choice, index) => (
          <Text key={choice.id} color={index === selected ? 'cyan' : undefined}>
            <Text bold color="red">{`${index === selected ? '●' : '○'} ${choice.label}`}</Text>
            {choice.description && <Text dimColor>{` — ${choice.description}`}</Text>}
          </Text>
        ))}
      </Box>
    </Box>
  )
}

// export default singleSelect
export default Simple
