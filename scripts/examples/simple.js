import { createDummy } from './lib.js'

// Both branches edit the same line: water -> coffee versus water -> tea.
// Merging incoming into main leaves one conflict in menu.txt.
export default function simple(directory) {
  const repo = createDummy(directory)
  repo.save('menu.txt', 'Drink: water')
  repo.save('config/settings.json', '{ "theme": "neutral" }')
  repo.save('notes with spaces.txt', 'Plan: undecided')
  repo.commit('Initial dummy')

  repo.run('switch', '--quiet', '-c', 'incoming')
  repo.save('menu.txt', 'Drink: coffee')
  repo.commit('Incoming drink change')

  repo.run('switch', '--quiet', 'main')
  repo.save('menu.txt', 'Drink: tea')
  repo.commit('Main branch changes')

  // Stop with conflict markers in the working tree for the CLI to inspect.
  repo.expectConflict('merge', '--no-ff', '--no-commit', 'incoming')
  return repo.directory
}
