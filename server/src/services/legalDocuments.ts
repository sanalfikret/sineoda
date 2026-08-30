import { dbGet, dbRun } from '../db.js'
import {
  DEFAULT_LEGAL_DOCUMENTS,
  DEFAULT_LEGAL_VERSION,
  isLegalSlug,
  type LegalDocument,
  type LegalSlug,
} from '../constants/legalDefaults.js'

const SETTINGS_KEY = 'legal_documents'

interface StoredLegalDocuments {
  version: string
  documents: Partial<Record<LegalSlug, LegalDocument>>
}

function formatUpdatedAt(date = new Date()) {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  })
}

function trimOrEmpty(value: unknown) {
  return String(value ?? '').trim()
}

export function parseLegalDocument(slug: LegalSlug, input: Partial<LegalDocument> | null | undefined): LegalDocument {
  const fallback = DEFAULT_LEGAL_DOCUMENTS[slug]
  const sections = Array.isArray(input?.sections)
    ? input!.sections
        .map((section) => ({
          heading: trimOrEmpty(section?.heading),
          body: trimOrEmpty(section?.body),
        }))
        .filter((section) => section.heading && section.body)
    : fallback.sections

  return {
    slug,
    title: trimOrEmpty(input?.title) || fallback.title,
    updatedAt: trimOrEmpty(input?.updatedAt) || fallback.updatedAt,
    sections: sections.length > 0 ? sections : fallback.sections,
  }
}

function readStored(): StoredLegalDocuments {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  if (!row?.value) {
    return { version: DEFAULT_LEGAL_VERSION, documents: {} }
  }

  try {
    const parsed = JSON.parse(row.value) as StoredLegalDocuments
    return {
      version: trimOrEmpty(parsed.version) || DEFAULT_LEGAL_VERSION,
      documents: parsed.documents ?? {},
    }
  } catch {
    return { version: DEFAULT_LEGAL_VERSION, documents: {} }
  }
}

function writeStored(data: StoredLegalDocuments) {
  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(data),
  ])
}

export function getLegalVersion() {
  return readStored().version
}

export function getLegalDocuments(): Record<LegalSlug, LegalDocument> {
  const stored = readStored()
  const documents = {} as Record<LegalSlug, LegalDocument>

  for (const slug of Object.keys(DEFAULT_LEGAL_DOCUMENTS) as LegalSlug[]) {
    documents[slug] = parseLegalDocument(slug, stored.documents[slug] ?? DEFAULT_LEGAL_DOCUMENTS[slug])
  }

  return documents
}

export function getLegalDocument(slug: LegalSlug) {
  const stored = readStored()
  return parseLegalDocument(slug, stored.documents[slug] ?? DEFAULT_LEGAL_DOCUMENTS[slug])
}

export function saveLegalDocument(slug: LegalSlug, input: Partial<LegalDocument>) {
  const stored = readStored()
  const now = new Date()
  const document = parseLegalDocument(slug, {
    ...input,
    slug,
    updatedAt: formatUpdatedAt(now),
  })

  stored.documents[slug] = document
  stored.version = now.toISOString().slice(0, 10)
  writeStored(stored)

  return document
}

export function resetLegalDocument(slug: LegalSlug) {
  const stored = readStored()
  delete stored.documents[slug]
  writeStored(stored)
  return DEFAULT_LEGAL_DOCUMENTS[slug]
}

export function validateLegalSlug(slug: string): slug is LegalSlug {
  return isLegalSlug(slug)
}
