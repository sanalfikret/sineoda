#!/usr/bin/env node
/**
 * Ensures App.tsx imports route modules and the production bundle includes AppRoot.
 * Catches missing imports (e.g. localeRoutes) before deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const appTsx = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8')
if (!appTsx.includes("from './routes'")) {
  console.error('check-frontend FAIL: App.tsx must import from ./routes')
  process.exit(1)
}

const routesIndex = fs.readFileSync(path.join(root, 'src/routes/index.tsx'), 'utf8')
if (!routesIndex.includes('localeRoutes')) {
  console.error('check-frontend FAIL: routes/index.tsx missing localeRoutes')
  process.exit(1)
}

const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:cpanel'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (build.status !== 0) {
  console.error('check-frontend FAIL: vite build failed')
  process.exit(build.status ?? 1)
}

const distIndex = path.join(root, 'dist/index.html')
if (!fs.existsSync(distIndex)) {
  console.error('check-frontend FAIL: dist/index.html missing')
  process.exit(1)
}

const html = fs.readFileSync(distIndex, 'utf8')
if (!html.includes('/assets/index-') || !html.includes('id="root"')) {
  console.error('check-frontend FAIL: dist/index.html invalid')
  process.exit(1)
}

console.log('check-frontend OK')
