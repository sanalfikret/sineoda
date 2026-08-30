import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJournalPosts } from '../api/client'
import { JournalCard } from '../components/journal/JournalCard'
import { JournalPagination } from '../components/journal/JournalPagination'
import { JOURNAL_PAGE_SIZE } from '../constants/journal'
import { DEFAULT_LANDING_SECTIONS } from '../constants/landingDefaults'
import { DEMO_JOURNAL_POSTS } from '../data/demoJournal'
import type { JournalListSection, JournalPost } from '../types/journal'

export function JournalListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [posts, setPosts] = useState<JournalPost[]>(DEMO_JOURNAL_POSTS)
  const [section, setSection] = useState<JournalListSection>(DEFAULT_LANDING_SECTIONS.journal)
  const [total, setTotal] = useState(DEMO_JOURNAL_POSTS.length)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    void fetchJournalPosts({ page, limit: JOURNAL_PAGE_SIZE })
      .then((data) => {
        if (data.posts.length > 0 || data.total === 0) {
          setPosts(data.posts)
          setTotal(data.total)
          setTotalPages(data.totalPages)
        }
        if (data.section) setSection(data.section)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [page])

  const handlePageChange = (nextPage: number) => {
    if (nextPage <= 1) {
      searchParams.delete('page')
      setSearchParams(searchParams, { replace: true })
      return
    }
    searchParams.set('page', String(nextPage))
    setSearchParams(searchParams, { replace: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
        {section.eyebrow}
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {section.title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-plooy-muted">
        {section.description}
      </p>

      {loading ? (
        <p className="mt-12 text-sm text-plooy-muted">Yükleniyor...</p>
      ) : posts.length === 0 ? (
        <p className="mt-12 text-sm text-plooy-muted">Henüz yayınlanmış yazı yok.</p>
      ) : (
        <>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
          <JournalPagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </main>
  )
}
