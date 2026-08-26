import fs from 'node:fs'
import path from 'node:path'

/** Render/cPanel gibi ortamlarda DATA_DIR yanlışsa yazılabilir yolu bul. */
export function resolveWritableDir(preferred: string, label: string): string {
  const fallbacks = [
    path.join(process.cwd(), label),
    path.join('/tmp', 'sineoda', label),
  ]

  for (const dir of [preferred, ...fallbacks]) {
    if (!dir) continue
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
      if (dir !== preferred) {
        console.warn(
          `[storage] ${label}: "${preferred}" not writable, using "${dir}" instead. Set DATA_DIR/UPLOADS_DIR to a mounted disk path in production.`,
        )
      }
      return dir
    } catch {
      continue
    }
  }

  throw new Error(
    `Cannot create writable ${label} directory. Tried: ${[preferred, ...fallbacks].join(', ')}`,
  )
}
