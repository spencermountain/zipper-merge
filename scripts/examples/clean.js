import { createDummy } from './lib.js'

// A baseline repository with no competing branch edits or pending Git operation.
// Use this to check the CLI's "No merge conflicts found" state.
export default function clean(directory) {
  const repo = createDummy(directory)
  repo.save('menu.txt', 'Drink: water')
  repo.save('config/settings.json', '{ "theme": "neutral" }')
  repo.save('notes with spaces.txt', 'Plan: undecided')
  repo.commit('Initial dummy')
  return repo.directory
}
