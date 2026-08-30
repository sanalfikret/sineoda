#!/usr/bin/env node
/**
 * Sunucunun gerçekten ayağa kalktığını doğrular (VPS/CI).
 * Eksik modül veya kırık import varsa push/deploy öncesi yakalanır.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverDir = path.join(root, 'server')

const requiredFiles = [
  'server/src/index.ts',
  'server/src/services/subscriptionActivation.ts',
  'server/src/services/plans.ts',
  'server/src/services/billingPlanDefaults.ts',
  'server/src/services/billingPlansConfig.ts',
]

for (const rel of requiredFiles) {
  const abs = path.join(root, rel)
  if (!fs.existsSync(abs)) {
    console.error(`check-server-boot FAIL: eksik dosya ${rel}`)
    process.exit(1)
  }
}

const child = spawn('node', ['--import', 'tsx', 'src/index.ts'], {
  cwd: serverDir,
  env: {
    ...process.env,
    PORT: '3999',
    NODE_ENV: 'test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let out = ''
const timeoutMs = 20000
const timeout = setTimeout(() => fail('zaman aşımı (20s)'), timeoutMs)

function fail(reason) {
  clearTimeout(timeout)
  child.kill('SIGTERM')
  console.error(`check-server-boot FAIL: ${reason}`)
  if (out.trim()) {
    console.error('--- son çıktı ---')
    console.error(out.slice(-3000))
  }
  process.exit(1)
}

child.stdout.on('data', (chunk) => {
  out += chunk.toString()
  if (out.includes('Plooy API')) {
    clearTimeout(timeout)
    child.kill('SIGTERM')
    console.log('check-server-boot OK')
    process.exit(0)
  }
})

child.stderr.on('data', (chunk) => {
  out += chunk.toString()
  if (/ERR_MODULE_NOT_FOUND|Cannot find module/i.test(out)) {
    fail('modül bulunamadı')
  }
})

child.on('exit', (code, signal) => {
  if (out.includes('Plooy API')) return
  fail(`çıkış kodu ${code ?? signal}`)
})
