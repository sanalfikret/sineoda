import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchJournalPosts } from '../api/client'
import { JournalCard } from '../components/journal/JournalCard'
import { JournalPagination } from '../components/journal/JournalPagination'
import { JOURNAL_PAGE_SIZE } from '../constants/journal'
import { DEMO_JOURNAL_POSTS } from '../data/demoJournal'
import { useLocale } from '../i18n/LocaleContext'
import type { JournalPost } from '../types/journal'

export function JournalListPage() {
  const { t } = useTranslation('journal')
  const { t: tl } = useTranslation('landing')
  const { localizePath } = useLocale()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [posts, setPosts] = useState<JournalPost[]>(DEMO_JOURNAL_POSTS)
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
      <Link
        to={localizePath('/')}
        className="inline-flex text-sm text-plooy-muted transition hover:text-white"
      >
        ← {tl('journal.backHome')}
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
        {tl('journal.eyebrow')}
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {tl('journal.title')}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-plooy-muted">
        {tl('journal.description')}
      </p>

      {loading ? (
        <p className="mt-12 text-sm text-plooy-muted">{t('loading')}</p>
      ) : posts.length === 0 ? (
        <p className="mt-12 text-sm text-plooy-muted">{t('empty')}</p>
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
