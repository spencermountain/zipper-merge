import { readFileSync } from 'node:fs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import sizeCheck from 'rollup-plugin-filesize-check'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const peers = Object.keys(pkg.peerDependencies)

export default {
  input: 'src/Index.jsx',
  jsx: 'react',
  external: (id) => peers.some((name) => id === name || id.startsWith(`${name}/`)),
  plugins: [
    nodeResolve(),
    sizeCheck({
      expect: 60, // sizes in kb
      warn: 15, // acceptable change (+/-)
      throw: 25 // unacceptable change (+/-)
    })
  ],
  output: {
    banner: `/* spencermountain/${pkg.name} ${pkg.version} - ${pkg.license} */\n`,
    file: 'builds/index.js',
    format: 'es',
    sourcemap: false
  }
}
