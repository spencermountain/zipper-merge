// node --import tsx playground/components/Table/scratch.jsx
import React from 'react'
import { useApp, useInput, render } from 'ink'
import App from './src/Index.jsx'


function Scratch() {
  const { exit } = useApp()
  useInput((input, key) => {
    if (key.escape) exit()
  })
  return (
    <App    />
  )
}

const app = render(<Scratch />, {})
try {
  await app.waitUntilExit()
} finally {
  app.unmount()
  app.cleanup()
}
