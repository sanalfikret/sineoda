import { useCallback, useEffect, useState } from 'react'
import { fetchLegalDocuments } from '../api/client'
import { LEGAL_DOCUMENTS, LEGAL_VERSION, type LegalDocument, type LegalSlug } from '../constants/legal'

export function useLegalDocuments() {
  const [documents, setDocuments] = useState<Record<LegalSlug, LegalDocument>>(LEGAL_DOCUMENTS)
  const [version, setVersion] = useState(LEGAL_VERSION)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchLegalDocuments()
      setDocuments(data.documents)
      setVersion(data.version)
    } catch {
      setDocuments(LEGAL_DOCUMENTS)
      setVersion(LEGAL_VERSION)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { documents, version, loading, refresh }
}

export function useLegalDocument(slug: LegalSlug) {
  const { documents, loading, refresh } = useLegalDocuments()
  return { document: documents[slug], loading, refresh }
}
