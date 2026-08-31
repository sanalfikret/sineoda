import { Router } from 'express'
import { getSiteMode } from '../services/siteMode.js'

const router = Router()

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  res.json(getSiteMode())
})

export default router
