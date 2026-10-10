/**
 * Rebuild composable athlete MCP Apps (single-file HTML).
 * Usage (from this directory): node build.mjs
 * Uses vite from the monorepo root (or ../program-week/node_modules).
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const mcpRoot = join(here, '../..')
const repoRoot = join(mcpRoot, '../../../../..')
const require = createRequire(join(repoRoot, 'package.json'))

const { build } = require('vite')
const { viteSingleFile } = require('vite-plugin-singlefile')

const sdkPath = require.resolve('@modelcontextprotocol/ext-apps/app-with-deps')
cpSync(sdkPath, join(here, 'app-with-deps.js'))

const SURFACES = [
  { key: 'overview', out: 'program-overview.html' },
  { key: 'statistics', out: 'profile-statistics.html' },
  { key: 'calendar', out: 'profile-calendar.html' },
  { key: 'workouts', out: 'workout-browse.html' },
  { key: 'measurements', out: 'body-measurements.html' },
  { key: 'blind-spot', out: 'blind-spot.html' },
]

const templateHtml = readFileSync(join(here, 'index.html'), 'utf8')
const templateMain = readFileSync(join(here, 'main.ts'), 'utf8')

for (const surface of SURFACES) {
  const staging = join(here, `.build-${surface.key}`)
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(join(staging, 'src'), { recursive: true })
  writeFileSync(
    join(staging, 'index.html'),
    templateHtml.replace('./main.ts', '/src/main.ts'),
  )
  writeFileSync(
    join(staging, 'src/main.ts'),
    templateMain
      .replaceAll('"__SURFACE__"', `"${surface.key}"`)
      .replaceAll(
        '"__SURFACE_ATTR__"',
        `"data-proxima-surface=\\"${surface.key}\\""`,
      ),
  )
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
    logLevel: 'warn',
  })

  const outHtml = join(mcpRoot, 'apps', surface.out)
  cpSync(join(staging, 'dist/index.html'), outHtml)
  console.log('wrote', outHtml)
  rmSync(staging, { recursive: true, force: true })
}
