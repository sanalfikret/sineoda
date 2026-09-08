import { Router } from 'express'
import { requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { getAccountingRules,saveAccountingRules,listNewAccountingMonths,getAccountingReport,markAccountingPaid } from '../services/accountingLedger.js'
import { dbAll } from '../db.js'
const router=Router()
router.use(requireAdmin)
router.get('/',(_req,res)=>{res.json({rules:getAccountingRules(),months:listNewAccountingMonths(),categories:dbAll('SELECT id,title FROM categories ORDER BY sort_order,id')})})
router.get('/:month',(req,res)=>{try{res.json({report:getAccountingReport(String(req.params.month))})}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Rapor alınamadı.'})}})
router.put('/rules',(req,res)=>{try{res.json({rules:saveAccountingRules(req.body)})}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Kaydedilemedi.'})}})
router.post('/:month/paid',(req:AuthRequest,res)=>{try{res.json({report:markAccountingPaid(String(req.params.month),String(req.body.creatorId??''),req.body.reference,req.auth!.userId)})}catch(e){res.status(400).json({error:e instanceof Error?e.message:'Kaydedilemedi.'})}})
export default router

