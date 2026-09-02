#!/usr/bin/env node
/**
 * Commit mesajından AI / Cursor attribution satırlarını kaldırır.
 * stdin veya dosya yolu ile kullanılır.
 */
import fs from 'node:fs'

const BLOCKED = [
  /^Co-authored-by:/i,
  /^Signed-off-by:\s*Cursor\b/i,
  /^Signed-off-by:\s*Composer\b/i,
  /cursoragent@cursor\.com/i,
  /Cursor Agent/i,
]

function clean(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !BLOCKED.some((re) => re.test(line.trim())))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

const target = process.argv[2]
if (target && target !== '-') {
  const raw = fs.readFileSync(target, 'utf8')
  fs.writeFileSync(target, `${clean(raw)}\n`)
} else {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  process.stdout.write(`${clean(Buffer.concat(chunks).toString('utf8'))}\n`)
}
