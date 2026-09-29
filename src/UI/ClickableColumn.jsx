import React, { Children, useEffect, useRef } from 'react'
import { Box, measureElement, useInput, useStdin, useStdout } from 'ink'

// Ink removes the leading Escape before delivering an unknown CSI sequence.
const mouseReport = /^\[<(\d+);(\d+);(\d+)([Mm])$/
export const isMouseInput = (input) => mouseReport.test(input)

// Multiple mounted columns share terminal reporting without disabling each other.
const users = new WeakMap()

// Each direct child is a clickable item. onClick receives its zero-based index.
// Requires an alternate screen with no Static output above the live layout.
const ClickableColumn = ({ children, onClick, enabled = true, ...props }) => {
  const items = Children.toArray(children)
  const refs = useRef([])
  const { stdout } = useStdout()
  const { isRawModeSupported } = useStdin()
  const active = Boolean(enabled && stdout.isTTY && isRawModeSupported)

  useEffect(() => {
    if (!active) return
    const count = users.get(stdout) ?? 0
    if (count === 0) stdout.write('\u001b[?1000h\u001b[?1006h')
    users.set(stdout, count + 1)
    return () => {
      const remaining = users.get(stdout) - 1
      if (remaining === 0) {
        stdout.write('\u001b[?1000l\u001b[?1006l')
        users.delete(stdout)
      } else {
        users.set(stdout, remaining)
      }
    }
  }, [stdout, active])

  useInput((input) => {
    const mouse = mouseReport.exec(input)
    if (!mouse || mouse[1] !== '0' || mouse[4] !== 'M') return
    const x = Number(mouse[2]) - 1
    const y = Number(mouse[3]) - 1
    const index = items.findIndex((item, index) => {
      const node = refs.current[index]
      if (!node) return false
      const bounds = measureElement(node)
      return x >= bounds.x && x < bounds.x + bounds.width &&
        y >= bounds.y && y < bounds.y + bounds.height
    })
    if (index !== -1) onClick?.(index)
  }, { isActive: active })

  return (
    <Box {...props} flexDirection="column">
      {items.map((child, index) => (
        <Box
          key={child.key ?? index}
          ref={(node) => { refs.current[index] = node }}
          flexDirection="column"
          flexShrink={0}
        >
          {child}
        </Box>
      ))}
    </Box>
  )
}

export default ClickableColumn
