import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { publicAssetUrl } from '../config.js'
import { uploadsDir } from '../db.js'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'

function createUploader(allowed: 'image' | 'video') {
  const maxSize = allowed === 'video' ? 500 * 1024 * 1024 : 10 * 1024 * 1024

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadsDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || (allowed === 'video' ? '.mp4' : '.jpg')
        cb(null, `${uuid()}${ext}`)
      },
    }),
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      if (allowed === 'image' && file.mimetype.startsWith('image/')) {
        cb(null, true)
      } else if (allowed === 'video' && file.mimetype.startsWith('video/')) {
        cb(null, true)
      } else {
        cb(new Error(allowed === 'video' ? 'Sadece video dosyaları yüklenebilir.' : 'Sadece görsel dosyaları yüklenebilir.'))
      }
    },
  })
}

const imageUpload = createUploader('image')
const videoUpload = createUploader('video')
const subtitleUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.vtt'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.vtt' || ext === '.srt' || file.mimetype.includes('text')) {
      cb(null, true)
    } else {
      cb(new Error('Sadece .vtt veya .srt altyazı dosyaları yüklenebilir.'))
    }
  },
})

const router = Router()

router.post('/image', requireAdmin, imageUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

router.post('/video', requireAdmin, videoUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

router.post('/subtitle', requireAdmin, subtitleUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

// Geriye dönük uyumluluk
router.post('/', requireAdmin, imageUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

export default router
