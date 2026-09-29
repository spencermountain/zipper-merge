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

const Show = ({ if: condition, fallback = null, children }) => {
  return condition ? <>{children}</> : <>{fallback}</>
}

export { Row, RowSpread, Col, Show }
