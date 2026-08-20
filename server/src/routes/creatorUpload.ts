import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { publicAssetUrl } from '../config.js'
import { uploadsDir } from '../db.js'
import { requireApprovedCreator, requireCreator, type AuthRequest } from '../middleware/auth.js'

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.pdf'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('document')
    if (allowed) cb(null, true)
    else cb(new Error('Sadece PDF veya görsel belgeler yüklenebilir.'))
  },
})

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Sadece görsel dosyaları yüklenebilir.'))
  },
})

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true)
    else cb(new Error('Sadece video dosyaları yüklenebilir.'))
  },
})

const router = Router()

router.post('/document', requireCreator, documentUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

router.post('/image', requireApprovedCreator, imageUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

router.post('/video', requireApprovedCreator, videoUpload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Dosya gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

export default router
