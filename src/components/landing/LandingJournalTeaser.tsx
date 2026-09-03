import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchJournalPosts } from '../../api/client'
import { DEMO_JOURNAL_POSTS } from '../../data/demoJournal'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import type { JournalPost } from '../../types/journal'
import { useLocale } from '../../i18n/LocaleContext'
import { JournalCard } from '../journal/JournalCard'

const TEASER_COUNT = 3

export function LandingJournalTeaser({ section }: { section: LandingSectionsConfig['journal'] }) {
  const { t } = useTranslation('landing')
  const { localizePath } = useLocale()
  const [posts, setPosts] = useState<JournalPost[]>(DEMO_JOURNAL_POSTS.slice(0, TEASER_COUNT))

  useEffect(() => {
    void fetchJournalPosts({ limit: TEASER_COUNT })
      .then((data) => {
        if (data.posts.length > 0) setPosts(data.posts.slice(0, TEASER_COUNT))
      })
      .catch(() => undefined)
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="border-y border-white/[0.06] bg-plooy-bg px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-plooy-accent">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {section.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base text-plooy-muted">{section.description}</p>
          </div>
          <Link
            to={localizePath('/dergi')}
            className="text-sm font-medium text-plooy-accent transition hover:text-white"
          >
            {t('journal.viewAll')}
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {posts.map((post) => (
            <JournalCard key={post.id} post={post} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
