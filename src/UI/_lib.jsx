import React from 'react'
import { Box } from 'ink'

const Row = ({ children }) => {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      width="100%"
      borderStyle="single"
    >
      {children}
    </Box>
  )
}

const RowSpread = ({ children }) => {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      width="100%"
      borderStyle="single"
    >
      {children}
    </Box>
  )
}

const Col = ({ children }) => {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      borderStyle="single"
    >
      {children}
    </Box>
  )
}
// const Row = ({ children }) => {
//   return h(Box, { flexDirection: 'row', width: '100%', borderStyle: 'single' }, children)
// }
// const Col = ({ children }) => {
//   return h(Box, { flexDirection: 'column', height: '100%', borderStyle: 'single' }, children)
// }

export { Row, RowSpread, Col }
