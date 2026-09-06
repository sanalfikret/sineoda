import { Router } from 'express'
import { receiveCreatorDocument } from '../services/creatorDocumentUpload.js'
import { dbAll } from '../db.js'
import type { FilmSchoolRow } from '../types.js'

const router = Router()


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

router.post('/upload-student-id', receiveCreatorDocument)

export default router
