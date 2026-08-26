import { Router } from 'express'
import { listCekimNotlariSections } from '../services/cekimNotlari.js'
import { ensureCekimNotlariDemoContentIfEmpty } from '../services/cekimNotlariSeed.js'

const SECTION_TITLE = 'Çekim İçin Notlar'

const router = Router()

router.get('/', (_req, res) => {
  try {
    ensureCekimNotlariDemoContentIfEmpty()
  } catch (error) {
    console.error('[cekim-notlari] demo seed failed:', error)
  }

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  res.json({
    title: SECTION_TITLE,
    sections: listCekimNotlariSections(),
  })
})

export default router
