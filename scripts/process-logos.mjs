import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = path.join(__dirname, '..', 'public', 'brand')

function isGreen(r, g, b) {
  return g > 120 && r < 120 && b < 120
}

function isRed(r, g, b) {
  return r > 120 && g < 100 && b < 100
}

function isDarkBg(r, g, b) {
  return r < 70 && g < 70 && b < 70
}

function isWhite(r, g, b) {
  return r > 180 && g > 180 && b > 180
}

async function buildTransparentWordmark(inputName, outputName, ink) {
  const input = path.join(base, inputName)
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (isDarkBg(r, g, b)) {
      out[i + 3] = 0
      continue
    }
    if (ink === 'black' && isWhite(r, g, b)) {
      out[i] = 12
      out[i + 1] = 12
      out[i + 2] = 12
    } else if (ink === 'black' && !isGreen(r, g, b) && !isRed(r, g, b) && r > 140) {
      out[i] = 12
      out[i + 1] = 12
      out[i + 2] = 12
    }
    out[i + 3] = 255
  }

  const meta = { raw: { width: info.width, height: info.height, channels: 4 } }
  await sharp(out, meta).png().toFile(path.join(base, outputName))
  console.log(`${inputName} -> ${outputName} (${ink}, ${info.width}x${info.height})`)
}

await buildTransparentWordmark('plooy-wordmark-light.png', 'plooy-wordmark.png', 'white')
await buildTransparentWordmark('plooy-wordmark-light.png', 'plooy-wordmark-on-light.png', 'black')
