/**
 * Rebuild apps/program-week.html (single-file MCP App).
 * Usage (from this directory):
 *   npm i vite vite-plugin-singlefile
 *   node build.mjs
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const here = dirname(fileURLToPath(import.meta.url))
const mcpRoot = join(here, '../..')
const outHtml = join(mcpRoot, 'apps/program-week.html')
const require = createRequire(import.meta.url)

const sdkPath = require.resolve(
  '@modelcontextprotocol/ext-apps/app-with-deps',
)
cpSync(sdkPath, join(here, 'app-with-deps.js'))

const staging = join(here, '.build')
mkdirSync(staging, { recursive: true })
mkdirSync(join(staging, 'src'), { recursive: true })
writeFileSync(
  join(staging, 'index.html'),
  readFileSync(join(here, 'index.html'), 'utf8').replace(
    './main.ts',
    '/src/main.ts',
  ),
)
cpSync(join(here, 'main.ts'), join(staging, 'src/main.ts'))
cpSync(join(here, 'app-with-deps.js'), join(staging, 'src/app-with-deps.js'))

await build({
  configFile: false,
  root: staging,
  plugins: [viteSingleFile()],
  build: {
    outDir: join(staging, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: join(staging, 'index.html') },
  },
})

cpSync(join(staging, 'dist/index.html'), outHtml)
console.log('wrote', outHtml)
