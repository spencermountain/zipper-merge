import React from 'react'
import { Box, Text } from 'ink'
import version from '../_version.js'
import Link from 'ink-link'

const Banner = function () {
  return (
    <Box flexDirection="row" gap={1} justifyContent="space-between" width="100%" maxHeight={3}>
      {/* green name */}
      <Box paddingX={1} paddingY={0} alignSelf="flex-start">
        <Link url="https://github.com/spencermountain/zipper-merge">
          <Text color="green" bold underline wrap="truncate">
            zipper-merge
          </Text>
        </Link>
      </Box>
      {/* version number*/}
      <Text color="grey" dim>
        v{version}
      </Text>
    </Box>
  )
}

export default Banner
