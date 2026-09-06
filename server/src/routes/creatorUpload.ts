import { Router } from 'express'
import { requireCreator } from '../middleware/auth.js'
import { receiveCreatorDocument } from '../services/creatorDocumentUpload.js'
const router = Router()
router.post('/document', requireCreator, receiveCreatorDocument)
router.post(['/image', '/video'], requireCreator, (_req,res) => {
  res.status(409).json({ error: 'Yalnızca PDF ve Word belgeleri yüklenebilir. Film, fragman ve afişi link olarak gönderin.', code: 'DOWNLOAD_LINK_REQUIRED' })
})
export default router
