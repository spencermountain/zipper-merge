import { runCmd, getConflicts } from './lib/index.js'

let conflicts = await getConflicts()
console.log(conflicts, 'conflicts')

const cmd = 'node --import tsx ./src/UI/App.jsx'
await runCmd(cmd)
