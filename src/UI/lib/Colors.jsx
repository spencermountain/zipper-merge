import React from 'react'
import { Box, Text, useStdout, Newline } from 'ink'

const colors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
const styles = [
  { label: 'Normal', props: {} },
  { label: 'Dim', props: { dimColor: true } },
  { label: 'Bold', props: { bold: true } },
  { label: 'BG', background: true, props: {} }
]

const columnWidth = 10
const labelWidth = 8

export default function Colors() {
  const { stdout } = useStdout()
  const perRow = Math.max(1, Math.floor(((stdout.columns || 80) - labelWidth) / columnWidth))
  const groups = []
  for (let index = 0; index < colors.length; index += perRow) {
    groups.push(colors.slice(index, index + perRow))
  }
  return (
    <Box flexDirection="column" gap={1} padding={2}>
      {[''].map((group) => (
        <Box key={group} flexDirection="column">
          <Text bold>{group}</Text>
          {groups.map((row, index) => (
            <Box key={row[0]} flexDirection="column" marginTop={index > 0 ? 1 : 0}>
              {styles.map(({ label, props, background }) => (
                <Box flexDirection="column" key={label}>
                  <Box width={labelWidth} flexShrink={0}>
                    <Text bold underline>
                      {label}
                    </Text>
                  </Box>
                  <Box flexDirection="row" gap={1}>
                    {row.map((color) => {
                      const name = color
                      return (
                        <Box key={name} width={columnWidth} flexShrink={0}>
                          {background ? (
                            <Text backgroundColor={name}>{' '.repeat(columnWidth - 2)}</Text>
                          ) : (
                            <Text color={name} {...props}>
                              {name}
                            </Text>
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                  <Newline count={1} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
}
