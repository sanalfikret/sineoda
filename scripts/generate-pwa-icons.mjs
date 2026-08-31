import { readFileSync } from 'node:fs'
import sharp from 'sharp'

const svg = readFileSync('public/icon.svg')

await sharp(svg).resize(192, 192).png().toFile('public/pwa-192x192.png')
await sharp(svg).resize(512, 512).png().toFile('public/pwa-512x512.png')
await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png')

const tvBanner = readFileSync('public/tv-banner.svg')
await sharp(tvBanner).resize(320, 180).png().toFile('public/tv-banner.png')

console.log('PWA + TV banner icons generated.')
