import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const wordmark = path.join(root, 'public', 'brand', 'plooy-wordmark-light.png')
const bg = '#080a12'

async function makeSquareIcon(size, outPath) {
  const logoWidth = Math.round(size * 0.78)
  const logo = await sharp(wordmark).resize(logoWidth).ensureAlpha().toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath)
}

await makeSquareIcon(192, path.join(root, 'public', 'pwa-192x192.png'))
await makeSquareIcon(512, path.join(root, 'public', 'pwa-512x512.png'))
await makeSquareIcon(180, path.join(root, 'public', 'apple-touch-icon.png'))

const tvBanner = path.join(root, 'public', 'tv-banner.svg')
await sharp(tvBanner).resize(320, 180).png().toFile(path.join(root, 'public', 'tv-banner.png'))

console.log('PWA + TV banner icons generated from plooy wordmark.')
