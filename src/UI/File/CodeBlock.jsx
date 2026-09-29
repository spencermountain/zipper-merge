import React from 'react'
import { render, Text } from 'ink'
import SyntaxHighlight from 'ink-syntax-highlight'

const CodeBlock = ({ ext, code }) => {
  return (
    <Block>
      <SyntaxHighlight language={ext} code={code} />
    </Block>
  )
}

export default CodeBlock
