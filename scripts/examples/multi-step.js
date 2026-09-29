import { createDummy } from './lib.js'

// The same competing edits as multi, but applied one commit at a time.
// Each commit touches a different file, so resolving step one cannot skip step two.
export default function multiStep(directory) {
  const repo = createDummy(directory)
  repo.save('menu.txt', 'Drink: water')
  repo.save('config/settings.json', '{ "theme": "neutral" }')
  repo.save('notes with spaces.txt', 'Plan: undecided')
  repo.commit('Initial dummy')

  repo.run('switch', '--quiet', '-c', 'incoming')
  repo.save('menu.txt', 'Drink: coffee')
  const drinkChange = repo.commit('Incoming drink change')
  repo.save('config/settings.json', '{ "theme": "dark" }')
  const settingsChange = repo.commit('Incoming settings change')

  repo.run('switch', '--quiet', 'main')
  repo.save('menu.txt', 'Drink: tea')
  repo.save('config/settings.json', '{ "theme": "light" }')
  repo.commit('Main branch changes')

  // Stop first at menu.txt. Resolve it, git add menu.txt, then cherry-pick --continue.
  // Git then applies settingsChange and stops at config/settings.json.
  // Cherry-picking keeps HEAD on main, satisfying the CLI's branch guard.
  repo.expectConflict('cherry-pick', drinkChange, settingsChange)
  return repo.directory
}
