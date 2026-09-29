import { readFileSync } from 'node:fs'
import { isBuiltin } from 'node:module'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const dependencies = Object.keys(pkg.dependencies)

export default {
  input: 'src/cli.js',
  jsx: 'react',
  external: (id) =>
    isBuiltin(id) || dependencies.some((name) => id === name || id.startsWith(`${name}/`)),
  output: {
    banner: `#!/usr/bin/env node\n/* ${pkg.name} ${pkg.version} - ${pkg.license} */`,
    file: 'builds/index.js',
    format: 'es',
    sourcemap: false
  }
}
