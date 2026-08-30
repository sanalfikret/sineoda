import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LEGAL_DOCUMENTS, LEGAL_LINKS, LEGAL_VERSION, type LegalSlug } from '../../constants/legal'

export function AdminLegalPage() {
  const [activeSlug, setActiveSlug] = useState<LegalSlug>(LEGAL_LINKS[0].slug)
  const doc = LEGAL_DOCUMENTS[activeSlug]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Yasal Metinler</h1>
        <p className="mt-2 text-sm text-plooy-muted">
          Platformda yayındaki tüm yasal metinler. Güncel sürüm: {LEGAL_VERSION}. İzleyici KVKK onayları{' '}
          <Link to="/admin/kullanicilar" className="text-plooy-gold hover:underline">
            İzleyiciler
          </Link>{' '}
          tablosunda görüntülenir.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEGAL_LINKS.map((link) => (
          <button
            key={link.slug}
            type="button"
            onClick={() => setActiveSlug(link.slug)}
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

      <article className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">Yasal</p>
            <h2 className="mt-1 text-xl font-bold text-white">{doc.title}</h2>
            <p className="mt-1 text-sm text-plooy-muted">Son güncelleme: {doc.updatedAt}</p>
          </div>
          <Link
            to={`/yasal/${doc.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
          >
            Sitede aç ↗
          </Link>
        </div>

        <div className="mt-6 space-y-6">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-base font-semibold text-white">{section.heading}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  )
}
