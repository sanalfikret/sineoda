import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { uploadsDir } from '../db.js'
import { publicAssetUrl } from '../config.js'
const types: Record<string, string> = { '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
export function isCreatorDocument(name: string, mime: string, bytes: Buffer) {
  const ext = path.extname(name).toLowerCase()
  if (!types[ext] || ![types[ext], 'application/octet-stream'].includes(mime)) return false
  if (ext === '.pdf') return bytes.subarray(0, 5).toString() === '%PDF-'
  if (ext === '.doc') return bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))
  if (!bytes.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'))) return false
  return bytes.includes(Buffer.from('[Content_Types].xml')) && bytes.includes(Buffer.from('word/document.xml'))
}
const receive = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 }, fileFilter: (_req,file,done) => { const ext=path.extname(file.originalname).toLowerCase(); if (types[ext] && [types[ext], 'application/octet-stream'].includes(file.mimetype)) done(null,true); else done(new Error('Yalnızca PDF, DOC veya DOCX belge yükleyebilirsiniz.')) } }).single('file')
export const receiveCreatorDocument: RequestHandler = (req,res,next) => {
  receive(req,res,error => {
    if (error) { res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Belge en fazla 15 MB olabilir.' : 'Yalnızca PDF, DOC veya DOCX belge yükleyebilirsiniz.' }); return }
    if (!req.file || !isCreatorDocument(req.file.originalname,req.file.mimetype,req.file.buffer)) { res.status(400).json({ error: 'Geçerli bir PDF, DOC veya DOCX belgesi gereklidir.' }); return }
    const filename = randomUUID()+path.extname(req.file.originalname).toLowerCase()
    try { fs.writeFileSync(path.join(uploadsDir,filename),req.file.buffer,{flag:'wx'}); res.status(201).json({ url: publicAssetUrl('/uploads/'+filename), filename }) } catch(error) { next(error) }
  })
}
