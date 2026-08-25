import { dbAll, dbGet, dbRun } from '../db.js'
import {
  FILM_LEGAL_DECLARATIONS,
  FILM_RIGHTS_CATEGORIES,
  REQUIRED_RIGHTS_DOC_TYPES,
} from '../constants/filmApplication.js'

export { FILM_LEGAL_DECLARATIONS, FILM_RIGHTS_CATEGORIES, REQUIRED_RIGHTS_DOC_TYPES }

const RIGHTS_IDS = new Set(FILM_RIGHTS_CATEGORIES.map((entry) => entry.id))
const LEGAL_IDS = new Set(FILM_LEGAL_DECLARATIONS.map((entry) => entry.id))

export function parseRightsDeclaration(body: Record<string, unknown>) {
  const input = body.rightsDeclaration
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null
  }
  const record = input as Record<string, unknown>
  const rights: Record<string, boolean> = {}
  const legal: Record<string, boolean> = {}

  for (const id of RIGHTS_IDS) {
    rights[id] = record[id] === true
  }
  for (const id of LEGAL_IDS) {
    legal[id] = record[id] === true
  }

  return { rights, legal }
}

export function validateFilmApplication(body: Record<string, unknown>, creatorId: string) {
  const declaration = parseRightsDeclaration(body)
  if (!declaration) {
    throw new Error('Hak beyanları eksik.')
  }

  for (const entry of FILM_RIGHTS_CATEGORIES) {
    if (!declaration.rights[entry.id]) {
      throw new Error(`"${entry.docLabel}" için beyan onayı gerekli.`)
    }
  }

  for (const entry of FILM_LEGAL_DECLARATIONS) {
    if (!declaration.legal[entry.id]) {
      throw new Error('Tüm yasal uygunluk beyanlarını onaylamalısınız.')
    }
  }

  const documentIds = Array.isArray(body.documentIds)
    ? body.documentIds.map(String).filter(Boolean)
    : []

  if (documentIds.length === 0) {
    throw new Error('Film başvurusu için hak belgelerini yüklemelisiniz.')
  }

  const placeholders = documentIds.map(() => '?').join(', ')
  const rows = dbAll<{ id: string; doc_type: string; content_id: string | null }>(
    `SELECT id, doc_type, content_id FROM creator_documents
     WHERE creator_id = ? AND id IN (${placeholders})`,
    [creatorId, ...documentIds],
  )

  if (rows.length !== documentIds.length) {
    throw new Error('Yüklenen belgelerden biri bulunamadı.')
  }

  const linkedElsewhere = rows.filter((row) => row.content_id)
  if (linkedElsewhere.length > 0) {
    throw new Error('Seçilen belgelerden biri başka bir başvuruya bağlı.')
  }

  const uploadedTypes = new Set(rows.map((row) => row.doc_type))
  for (const docType of REQUIRED_RIGHTS_DOC_TYPES) {
    if (!uploadedTypes.has(docType)) {
      const label =
        FILM_RIGHTS_CATEGORIES.find((entry) => entry.docType === docType)?.docLabel ?? docType
      throw new Error(`Eksik belge: ${label}`)
    }
  }

  return { declaration, documentIds }
}

export function linkApplicationDocuments(contentId: string, creatorId: string, documentIds: string[]) {
  if (documentIds.length === 0) return

  const placeholders = documentIds.map(() => '?').join(', ')
  dbRun(
    `UPDATE creator_documents SET content_id = ?
     WHERE creator_id = ? AND id IN (${placeholders}) AND (content_id IS NULL OR content_id = '')`,
    [contentId, creatorId, ...documentIds],
  )
}

export function saveApplicationDeclaration(contentId: string, declaration: NonNullable<ReturnType<typeof parseRightsDeclaration>>) {
  dbRun('UPDATE content SET application_declaration_json = ? WHERE id = ?', [
    JSON.stringify({
      declaredAt: new Date().toISOString(),
      rights: declaration.rights,
      legal: declaration.legal,
    }),
    contentId,
  ])
}

export function getContentApplicationDocuments(contentId: string, creatorId: string) {
  return dbAll<{ id: string; doc_type: string; file_url: string; uploaded_at: string }>(
    `SELECT id, doc_type, file_url, uploaded_at FROM creator_documents
     WHERE creator_id = ? AND content_id = ?
     ORDER BY uploaded_at ASC`,
    [creatorId, contentId],
  )
}

export function creatorHasBaseDocuments(creatorId: string) {
  const row = dbGet<{ count: number }>(
    'SELECT COUNT(*) AS count FROM creator_documents WHERE creator_id = ?',
    [creatorId],
  )
  return (row?.count ?? 0) > 0
}
