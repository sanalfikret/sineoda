import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const base = path.join(__dirname, '..', 'public', 'brand')

async function processLogo(inputName, lightOut, darkOut) {
  const input = path.join(base, inputName)
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const light = Buffer.from(data)
  const dark = Buffer.from(data)

  const isGreen = (r, g, b) => g > 120 && r < 120 && b < 120
  const isRed = (r, g, b) => r > 120 && g < 100 && b < 100
  const isBlackBg = (r, g, b) => r < 45 && g < 45 && b < 45
  const isWhite = (r, g, b) => r > 180 && g > 180 && b > 180

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (isBlackBg(r, g, b)) {
      light[i + 3] = 0
      dark[i + 3] = 0
      continue
    }
    if (isWhite(r, g, b)) {
      dark[i] = 12
      dark[i + 1] = 12
      dark[i + 2] = 12
      dark[i + 3] = 255
    } else if (!isGreen(r, g, b) && !isRed(r, g, b) && r > 140) {
      dark[i] = 12
      dark[i + 1] = 12
      dark[i + 2] = 12
    }
  }

  const meta = { raw: { width: info.width, height: info.height, channels: 4 } }
  await sharp(light, meta).png().toFile(path.join(base, lightOut))
  await sharp(dark, meta).png().toFile(path.join(base, darkOut))
  console.log(`${inputName} -> ${lightOut}, ${darkOut}`)
}

await processLogo('plooy-wordmark-light.png', 'plooy-wordmark-on-dark.png', 'plooy-wordmark-on-light.png')
await processLogo('plooy-mark-light.png', 'plooy-mark-on-dark.png', 'plooy-mark-on-light.png')
