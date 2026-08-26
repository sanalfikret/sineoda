import { Router } from 'express'
import { listCekimNotlariSections } from '../services/cekimNotlari.js'
import { ensureCekimNotlariCategories } from '../services/cekimNotlariCategories.js'
import { ensureCekimNotlariDemoContent } from '../services/cekimNotlariSeed.js'

const SECTION_TITLE = 'Çekim İçin Notlar'

const router = Router()

router.get('/', (_req, res) => {
  try {
    ensureCekimNotlariCategories()
    ensureCekimNotlariDemoContent()
  } catch (error) {
    console.error('[cekim-notlari] demo seed failed:', error)
  }

  res.json({
    title: SECTION_TITLE,
    sections: listCekimNotlariSections(),
  })
})

export default router
