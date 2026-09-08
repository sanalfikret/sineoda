import { randomUUID } from 'node:crypto'
import { dbAll, dbRun } from '../db.js'
function init() {
  dbRun('CREATE TABLE IF NOT EXISTS user_access_log (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ip TEXT NOT NULL, user_agent TEXT, created_at TEXT NOT NULL)')
  dbRun('CREATE INDEX IF NOT EXISTS user_access_log_date ON user_access_log(created_at)')
}
export function recordAccess(userId:string,ip:string,userAgent:string|null) {
  init()
  dbRun('DELETE FROM user_access_log WHERE created_at < ?', [new Date(Date.now()-90*86400000).toISOString()])
  dbRun('INSERT INTO user_access_log VALUES (?,?,?,?,?)',[randomUUID(),userId,ip,userAgent,new Date().toISOString()])
}
export function listAccess(query:string,offset:number) {
  init()
  dbRun('DELETE FROM user_access_log WHERE created_at < ?', [new Date(Date.now()-90*86400000).toISOString()])
  return dbAll('SELECT a.*, u.name, u.email FROM user_access_log a JOIN users u ON u.id=a.user_id WHERE u.name LIKE ? OR u.email LIKE ? ORDER BY a.created_at DESC LIMIT 50 OFFSET ?', ['%'+query+'%','%'+query+'%',offset])
}
