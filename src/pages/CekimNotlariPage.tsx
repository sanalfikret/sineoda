import { useEffect, useState } from 'react'
import { AppShell, useContentUI } from '../components/AppShell'
import { fetchCekimNotlariSections } from '../api/client'
import type { ContentItem } from '../types/content'
import { CEKIM_NOTLARI_NAV_LABEL, CEKIM_NOTLARI_SECTION_TITLE } from '../constants/cekimNotlari'
import { CekimNotlariCard } from '../components/cekimNotlari/CekimNotlariCard'
import { Hero } from '../components/Hero'

interface CekimSection {
  id: string
  title: string
  items: ContentItem[]
}

function CekimNotlariContent() {
  const { openDetail, openPlayer } = useContentUI()
  const [sections, setSections] = useState<CekimSection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchCekimNotlariSections()
      .then((data) => setSections(data.sections))
      .catch((err) => setError(err instanceof Error ? err.message : 'İçerik yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const heroItem = sections.flatMap((section) => section.items)[0] ?? null

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="px-4 py-16 text-center text-sineoda-muted sm:px-6">{error}</p>
    )
  }

  return (
    <main className="bg-sineoda-bg">
      {heroItem ? (
        <Hero
          item={heroItem}
          onPlay={openPlayer}
          onDetails={openDetail}
          eyebrow={CEKIM_NOTLARI_SECTION_TITLE}
        />
      ) : (
        <div className="px-4 pb-4 pt-28 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-accent">
            {CEKIM_NOTLARI_SECTION_TITLE}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{CEKIM_NOTLARI_NAV_LABEL}</h1>
        </div>
      )}

      <p className="mx-auto max-w-3xl px-4 pb-8 pt-2 text-center text-sm text-sineoda-muted sm:px-6">
        Alanında uzman isimlerden eğitici videolar — setten post prodüksiyona.
      </p>

      <div className="mx-auto max-w-[1400px] space-y-10 px-5 pb-24 sm:px-8">
        {sections.map((section) => (
          <section key={section.id} className="border-t border-white/5 pt-8 first:border-t-0 first:pt-0">
            <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">{section.title}</h2>
            {section.items.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
                {section.items.map((item) => (
                  <CekimNotlariCard key={item.id} item={item} onSelect={openDetail} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-sineoda-muted">Bu bölüm için henüz video eklenmedi.</p>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}

export function CekimNotlariPage() {
  return (
    <AppShell>
      <CekimNotlariContent />
    </AppShell>
  )
}
