import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
import { publicAssetUrl } from '../config.js'
import { dbAll, uploadsDir } from '../db.js'
import type { FilmSchoolRow } from '../types.js'

const router = Router()

const studentIdUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `${uuid()}${ext}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    if (allowed) cb(null, true)
    else cb(new Error('Öğrenci kimliği yalnızca görsel veya PDF olarak yüklenebilir.'))
  },
})

router.get('/schools', (_req, res) => {
  const rows = dbAll<FilmSchoolRow>(
    "SELECT * FROM film_schools WHERE status = 'active' ORDER BY name",
  )

  res.json({
    schools: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      website: row.website,
    })),
  })
})

router.post('/upload-student-id', studentIdUpload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Öğrenci kimliği dosyası gerekli.' })
    return
  }
  const url = publicAssetUrl(`/uploads/${req.file.filename}`)
  res.status(201).json({ url, filename: req.file.filename })
})

export default router
