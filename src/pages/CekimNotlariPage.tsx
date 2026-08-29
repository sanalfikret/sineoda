import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell, useContentUI } from '../components/AppShell'
import { fetchCekimNotlariSections } from '../api/client'
import { useContent } from '../context/ContentContext'
import type { ContentItem } from '../types/content'
import { CEKIM_NOTLARI_NAV_LABEL, CEKIM_NOTLARI_SECTION_TITLE } from '../constants/cekimNotlari'
import { CekimNotlariCard } from '../components/cekimNotlari/CekimNotlariCard'
import { Hero } from '../components/Hero'

const PREVIEW_COUNT = 3
const SKELETON_SECTIONS = 4

function CekimNotlariContent() {
  const [searchParams] = useSearchParams()
  const focusCategoryId = searchParams.get('kategori')?.trim() || ''
  const { openDetail, openPlayer } = useContentUI()
  const { cekimNotlariSections, isLoading: bootstrapLoading, refresh } = useContent()
  const [sections, setSections] = useState(cekimNotlariSections)
  const [loadingFallback, setLoadingFallback] = useState(false)
  const [error, setError] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    focusCategoryId ? new Set([focusCategoryId]) : new Set(),
  )

  useEffect(() => {
    if (cekimNotlariSections.length > 0) {
      setSections(cekimNotlariSections)
    }
  }, [cekimNotlariSections])

  useEffect(() => {
    if (!focusCategoryId || sections.length === 0) return
    if (!sections.some((section) => section.id === focusCategoryId)) return
    setExpandedIds((current) => {
      if (current.has(focusCategoryId)) return current
      return new Set([...current, focusCategoryId])
    })
    requestAnimationFrame(() => {
      document.getElementById(`cekim-section-${focusCategoryId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [focusCategoryId, sections])

  useEffect(() => {
    if (bootstrapLoading || sections.length > 0) return

    setLoadingFallback(true)
    void fetchCekimNotlariSections()
      .then((data) => setSections(data.sections))
      .catch((err) => setError(err instanceof Error ? err.message : 'İçerik yüklenemedi.'))
      .finally(() => setLoadingFallback(false))
  }, [bootstrapLoading, sections.length])

  useEffect(() => {
    if (!bootstrapLoading && cekimNotlariSections.length === 0 && sections.length === 0) {
      void refresh()
    }
  }, [bootstrapLoading, cekimNotlariSections.length, sections.length, refresh])

  const toggleSection = (sectionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const loading = (bootstrapLoading && sections.length === 0) || loadingFallback
  const heroItem = sections.flatMap((section) => section.items)[0] ?? null

  if (error) {
    return (
      <p className="px-4 py-16 text-center text-sineoda-muted sm:px-6">{error}</p>
    )
  }

  return (
    <main className="bg-sineoda-bg">
      {!loading && heroItem ? (
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

      <div className="mx-auto max-w-[1400px] space-y-6 px-5 pb-24 sm:px-8">
        {loading ? (
          Array.from({ length: SKELETON_SECTIONS }, (_, index) => (
            <section key={index} className="border-t border-white/5 pt-6 first:border-t-0 first:pt-0">
              <div className="mb-4 h-7 w-48 animate-pulse rounded-lg bg-white/10" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                {Array.from({ length: PREVIEW_COUNT }, (__, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="flex h-[8.5rem] animate-pulse overflow-hidden rounded-xl border border-white/[0.06] bg-sineoda-surface"
                  >
                    <div className="w-[38%] bg-white/5 sm:w-[42%]" />
                    <div className="flex flex-1 flex-col justify-center gap-2 px-4 py-3">
                      <div className="h-3 w-16 rounded bg-white/10" />
                      <div className="h-4 w-full rounded bg-white/10" />
                      <div className="h-3 w-4/5 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        ) : (
          sections.map((section) => {
            const expanded = expandedIds.has(section.id)
            const hasMore = section.items.length > PREVIEW_COUNT
            const visibleItems = expanded ? section.items : section.items.slice(0, PREVIEW_COUNT)

            return (
              <section
                key={section.id}
                id={`cekim-section-${section.id}`}
                className="border-t border-white/5 pt-6 first:border-t-0 first:pt-0"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="group mb-4 flex w-full items-center justify-between gap-3 text-left"
                  aria-expanded={expanded}
                >
                  <span className="text-lg font-semibold text-white transition group-hover:text-sineoda-accent sm:text-xl">
                    {section.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm text-sineoda-muted">
                    {section.items.length > 0 && (
                      <span className="hidden sm:inline">{expanded ? 'Daralt' : `${section.items.length} video`}</span>
                    )}
                    <ChevronIcon expanded={expanded} />
                  </span>
                </button>

                {section.items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                      {visibleItems.map((item) => (
                        <CekimNotlariCard key={item.id} item={item as ContentItem} onSelect={openDetail} />
                      ))}
                    </div>
                    {!expanded && hasMore && (
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="mt-3 text-sm font-medium text-sineoda-accent transition hover:text-white"
                      >
                        Tümünü gör ({section.items.length} video)
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-sineoda-muted">Bu bölüm için henüz video eklenmedi.</p>
                )}
              </section>
            )
          })
        )}
      </div>
    </main>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function CekimNotlariPage() {
  return (
    <AppShell>
      <CekimNotlariContent />
    </AppShell>
  )
}
