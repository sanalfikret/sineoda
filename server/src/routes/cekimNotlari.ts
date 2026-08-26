import { Router } from 'express'
import { listCekimNotlariSections } from '../services/cekimNotlari.js'

const SECTION_TITLE = 'Çekim İçin Notlar'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    title: SECTION_TITLE,
    sections: listCekimNotlariSections(),
  })
})

export default router
