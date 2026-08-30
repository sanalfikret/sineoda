import { useEffect } from 'react'
import { LEGAL_DOCUMENTS, type LegalSlug } from '../constants/legal'

interface LegalDocumentModalProps {
  slug: LegalSlug
  open: boolean
  onClose: () => void
  closeLabel?: string
}

export function LegalDocumentModal({ slug, open, onClose, closeLabel = 'Kapat' }: LegalDocumentModalProps) {
  const doc = LEGAL_DOCUMENTS[slug]

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(90dvh,820px)] w-full max-w-2xl flex-col rounded-t-2xl border border-white/10 bg-plooy-bg shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">Yasal</p>
            <h2 id="legal-modal-title" className="mt-1 text-xl font-bold text-white sm:text-2xl">
              {doc.title}
            </h2>
            <p className="mt-1 text-xs text-plooy-muted">Son güncelleme: {doc.updatedAt}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            {closeLabel}
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-6 sm:px-6">
          <div className="space-y-6">
            {doc.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-base font-semibold text-white">{section.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{section.body}</p>
              </section>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-plooy-gold py-3 text-sm font-semibold text-plooy-bg"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
