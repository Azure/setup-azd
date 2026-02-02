import * as esbuild from 'esbuild'
import { builtinModules } from 'node:module'

await esbuild.build({
  entryPoints: ['lib/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  sourcemap: true,
  external: builtinModules.concat(builtinModules.map(m => `node:${m}`)),
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
  }
})
