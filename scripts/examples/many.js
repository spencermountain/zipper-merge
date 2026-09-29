import { createDummy } from './lib.js'

// Ten files with 1, 1, 2, 2, 3, 3, 4, 6, 8, and 10 conflicts: 40 in total.
const conflictCounts = [1, 1, 2, 2, 3, 3, 4, 6, 8, 10]

export default function many(directory) {
  const repo = createDummy(directory)
  const writeFiles = (value) => {
    conflictCounts.forEach((count, fileIndex) => {
      const filename = `examples/file-${String(fileIndex + 1).padStart(2, '0')}.txt`
      const lines = []
      for (let block = 1; block <= count; block += 1) {
        lines.push(`Section ${block}: ${value}`)
        // Identical, uniquely numbered context separates the edited lines so
        // Git produces distinct conflict blocks instead of one large conflict.
        for (let context = 1; context <= 8; context += 1) {
          lines.push(`Unchanged context for section ${block}, line ${context}`)
        }
      }
      repo.save(filename, lines.join('\n'))
    })
  }

  writeFiles('original')
  repo.commit('Initial dummy')

  // Both branches replace the same 40 lines with different values.
  repo.run('switch', '--quiet', '-c', 'incoming')
  writeFiles('incoming choice')
  repo.commit('Incoming changes to all 40 sections')

  repo.run('switch', '--quiet', 'main')
  writeFiles('main choice')
  repo.commit('Main changes to all 40 sections')

  repo.expectConflict('merge', '--no-ff', '--no-commit', 'incoming')
  return repo.directory
}
