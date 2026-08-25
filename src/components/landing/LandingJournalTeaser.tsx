import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJournalPosts } from '../../api/client'
import { DEMO_JOURNAL_POSTS } from '../../data/demoJournal'
import type { LandingSectionsConfig } from '../../constants/landingDefaults'
import type { JournalPost } from '../../types/journal'
import { JournalCard } from '../journal/JournalCard'

export function LandingJournalTeaser({
  section,
}: {
  section: LandingSectionsConfig['journal']
}) {
  const [posts, setPosts] = useState<JournalPost[]>(DEMO_JOURNAL_POSTS.slice(0, 3))

  useEffect(() => {
    void fetchJournalPosts({ limit: 3 })
      .then((data) => {
        if (data.posts.length > 0) setPosts(data.posts)
      })
      .catch(() => undefined)
  }, [])

  if (posts.length === 0) return null

  const [featured, ...rest] = posts

  return (
    <section className="border-y border-white/[0.06] bg-sineoda-bg px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-accent">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {section.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base text-sineoda-muted">{section.description}</p>
          </div>
          <Link
            to="/dergi"
            className="text-sm font-medium text-sineoda-accent transition hover:text-white"
          >
            Tüm yazılar →
          </Link>
        </div>

        <div className="mt-10 space-y-5">
          <JournalCard post={featured} featured />
          <div className="grid gap-5 md:grid-cols-2">
            {rest.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
