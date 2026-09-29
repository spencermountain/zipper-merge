import { createDummy } from './lib.js'

// Three simultaneous conflicts, including a nested path and a filename with spaces:
// menu: water -> coffee / tea; theme: neutral -> dark / light;
// notes: undecided -> incoming / main.
export default function multi(directory) {
  const repo = createDummy(directory)
  repo.save('menu.txt', 'Drink: water')
  repo.save('config/settings.json', '{ "theme": "neutral" }')
  repo.save('notes with spaces.txt', 'Plan: undecided')
  repo.commit('Initial dummy')

  repo.run('switch', '--quiet', '-c', 'incoming')
  repo.save('menu.txt', 'Drink: coffee')
  repo.commit('Incoming drink change')
  repo.save('config/settings.json', '{ "theme": "dark" }')
  repo.save('notes with spaces.txt', 'Plan: incoming')
  repo.commit('Incoming settings change')

  repo.run('switch', '--quiet', 'main')
  repo.save('menu.txt', 'Drink: tea')
  repo.save('config/settings.json', '{ "theme": "light" }')
  repo.save('notes with spaces.txt', 'Plan: main')
  repo.commit('Main branch changes')

  // A merge combines the whole incoming branch, so all three conflicts appear at once.
  repo.expectConflict('merge', '--no-ff', '--no-commit', 'incoming')
  return repo.directory
}
