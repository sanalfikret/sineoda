import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminLegalDocuments,
  resetAdminLegalDocument,
  updateAdminLegalDocument,
} from '../../api/client'
import { LEGAL_LINKS, type LegalDocument, type LegalSlug } from '../../constants/legal'

type SectionDraft = { heading: string; body: string }

function cloneSections(sections: SectionDraft[]) {
  return sections.map((section) => ({ ...section }))
}

export function AdminLegalPage() {
  const [activeSlug, setActiveSlug] = useState<LegalSlug>(LEGAL_LINKS[0].slug)
  const [version, setVersion] = useState('')
  const [documents, setDocuments] = useState<Record<LegalSlug, LegalDocument> | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSections, setDraftSections] = useState<SectionDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const doc = documents?.[activeSlug]

  const loadDocuments = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminLegalDocuments()
      setDocuments(data.documents)
      setVersion(data.version)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yasal metinler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  useEffect(() => {
    if (!doc || editing) return
    setDraftTitle(doc.title)
    setDraftSections(cloneSections(doc.sections))
  }, [doc, editing])

  const startEdit = () => {
    if (!doc) return
    setDraftTitle(doc.title)
    setDraftSections(cloneSections(doc.sections))
    setEditing(true)
    setMessage('')
    setError('')
  }

  const cancelEdit = () => {
    if (!doc) return
    setDraftTitle(doc.title)
    setDraftSections(cloneSections(doc.sections))
    setEditing(false)
  }

  const updateSection = (index: number, patch: Partial<SectionDraft>) => {
    setDraftSections((sections) =>
      sections.map((section, idx) => (idx === index ? { ...section, ...patch } : section)),
    )
  }

  const addSection = () => {
    setDraftSections((sections) => [...sections, { heading: 'Yeni bölüm', body: '' }])
  }

  const removeSection = (index: number) => {
    setDraftSections((sections) => sections.filter((_, idx) => idx !== index))
  }

  const handleSave = async () => {
    if (!doc) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const cleaned = draftSections
        .map((section) => ({
          heading: section.heading.trim(),
          body: section.body.trim(),
        }))
        .filter((section) => section.heading && section.body)

      if (cleaned.length === 0) {
        setError('En az bir dolu bölüm gerekli.')
        return
      }

      const { document, version: nextVersion } = await updateAdminLegalDocument(activeSlug, {
        title: draftTitle.trim() || doc.title,
        sections: cleaned,
      })

      setDocuments((current) => (current ? { ...current, [activeSlug]: document } : current))
      setVersion(nextVersion)
      setEditing(false)
      setMessage('Yasal metin kaydedildi ve sitede yayına alındı.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('Bu metni varsayılan içeriğe döndürmek istediğine emin misin?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const { document, version: nextVersion } = await resetAdminLegalDocument(activeSlug)
      setDocuments((current) => (current ? { ...current, [activeSlug]: document } : current))
      setVersion(nextVersion)
      setDraftTitle(document.title)
      setDraftSections(cloneSections(document.sections))
      setEditing(false)
      setMessage('Metin varsayılan sürüme döndürüldü.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sıfırlanamadı.')
    } finally {
      setSaving(false)
    }
  }

  const previewDoc = useMemo(() => {
    if (!editing) return doc
    return {
      slug: activeSlug,
      title: draftTitle,
      updatedAt: doc?.updatedAt ?? '',
      sections: draftSections,
    }
  }, [activeSlug, doc, draftSections, draftTitle, editing])

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Yasal Metinler</h1>
          <p className="mt-2 text-sm text-plooy-muted">
            Metinleri buradan düzenleyebilirsin. Kaydettiğinde sitede anında güncellenir.
            {version ? ` Sürüm: ${version}.` : ''}
          </p>
        </div>
        <Link
          to="/admin/kullanicilar"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
        >
          İzleyici onayları →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEGAL_LINKS.map((link) => (
          <button
            key={link.slug}
            type="button"
            onClick={() => {
              setActiveSlug(link.slug)
              setEditing(false)
              setMessage('')
              setError('')
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeSlug === link.slug
                ? 'bg-plooy-gold/15 text-plooy-gold'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-plooy-muted">Yükleniyor...</p>
      ) : !previewDoc ? (
        <p className="text-sm text-plooy-muted">Metin bulunamadı.</p>
      ) : (
        <article className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">Yasal</p>
              {editing ? (
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-lg font-bold text-white outline-none focus:border-plooy-gold"
                />
              ) : (
                <h2 className="mt-1 text-xl font-bold text-white">{previewDoc.title}</h2>
              )}
              <p className="mt-1 text-sm text-plooy-muted">
                Son güncelleme: {editing ? 'Kayıtta güncellenecek' : previewDoc.updatedAt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!editing ? (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
                  >
                    Düzenle
                  </button>
                  <Link
                    to={`/yasal/${previewDoc.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    Sitede aç ↗
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg disabled:opacity-60"
                  >
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={cancelEdit}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleReset()}
                    className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    Varsayılana dön
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {editing
              ? draftSections.map((section, index) => (
                  <section key={`${index}-${section.heading}`} className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-plooy-muted">
                        Bölüm {index + 1}
                      </span>
                      {draftSections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="text-xs text-red-300 hover:text-red-200"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                    <input
                      value={section.heading}
                      onChange={(event) => updateSection(index, { heading: event.target.value })}
                      placeholder="Başlık"
                      className="mb-3 w-full rounded-lg border border-white/10 bg-plooy-bg px-3 py-2 text-sm font-semibold text-white outline-none focus:border-plooy-gold"
                    />
                    <textarea
                      value={section.body}
                      onChange={(event) => updateSection(index, { body: event.target.value })}
                      rows={5}
                      placeholder="Metin"
                      className="w-full rounded-lg border border-white/10 bg-plooy-bg px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-plooy-gold"
                    />
                  </section>
                ))
              : previewDoc.sections.map((section) => (
                  <section key={section.heading}>
                    <h3 className="text-base font-semibold text-white">{section.heading}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{section.body}</p>
                  </section>
                ))}
          </div>

          {editing && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={addSection}
                className="rounded-lg border border-plooy-gold/30 px-4 py-2 text-sm text-plooy-gold hover:bg-plooy-gold/10"
              >
                + Bölüm ekle
              </button>
            </div>
          )}
        </article>
      )}
    </div>
  )
}
