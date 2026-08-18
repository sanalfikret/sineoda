import { useEffect, useState } from 'react'
import { fetchJournalPosts } from '../api/client'
import { JournalCard } from '../components/journal/JournalCard'
import { DEMO_JOURNAL_POSTS } from '../data/demoJournal'
import type { JournalPost } from '../types/journal'

export function JournalListPage() {
  const [posts, setPosts] = useState<JournalPost[]>(DEMO_JOURNAL_POSTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchJournalPosts()
      .then((data) => {
        if (data.posts.length > 0) setPosts(data.posts)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  const [featured, ...rest] = posts

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sineoda-accent">Dergi</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Bağımsız sinema üzerine yazılar, festival notları ve seçkiler
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-sineoda-muted">
        Dünya bağımsız sinemasından haberler, küratör notları ve katalog önerileri.
      </p>

      {loading ? (
        <p className="mt-12 text-sm text-sineoda-muted">Yükleniyor...</p>
      ) : (
        <div className="mt-12 space-y-5">
          {featured && <JournalCard post={featured} featured />}
          <div className="grid gap-5 md:grid-cols-2">
            {rest.map((post) => (
              <JournalCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
