#!/usr/bin/env node
/**
 * Commit mesajından Cursor co-author satırını kaldırır.
 * stdin veya dosya yolu ile kullanılır.
 */
import fs from 'node:fs'

function clean(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^Co-authored-by:\s*Cursor\b/i.test(line.trim()))
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
