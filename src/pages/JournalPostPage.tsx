import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchJournalPost, resolveMediaUrl } from '../api/client'
import { useOptionalContentUI } from '../components/AppShell'
import { resolveJournalPost } from '../data/demoJournal'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import type { JournalPost } from '../types/journal'
import { formatJournalDate, journalBodyParagraphs } from '../utils/journal'
import { BRAND_NAME } from '../constants/brand'

export function JournalPostPage() {
  const { slug = '' } = useParams()
  const { user, activeProfile } = useAuth()
  const { catalog } = useContent()
  const contentUI = useOptionalContentUI()
  const isMember = Boolean(user && activeProfile)
  const [post, setPost] = useState<JournalPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchJournalPost(slug)
      .then((data) => setPost(data.post))
      .catch(() => setPost(resolveJournalPost(slug)))
      .finally(() => setLoading(false))
  }, [slug])

  const linkedContent = post?.contentId ? catalog.find((item) => item.id === post.contentId) : null

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center text-sineoda-muted">
        Yükleniyor...
      </div>
    )
  }

  if (!post) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg text-white">Yazı bulunamadı.</p>
        <Link to="/dergi" className="text-sineoda-accent hover:underline">
          Dergiye dön
        </Link>
      </div>
    )
  }

  return (
    <>
      {!isMember && (
        <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Link to="/dergi" className="text-sm text-sineoda-muted transition hover:text-white">
              ← Dergi
            </Link>
            <Link to="/" className="text-sm font-medium text-sineoda-accent">
              {BRAND_NAME}
            </Link>
          </div>
        </header>
      )}

      <article className={`mx-auto max-w-3xl px-5 sm:px-8 ${isMember ? 'py-8' : 'py-10 sm:py-14'}`}>
        {isMember && (
          <Link to="/dergi" className="text-sm text-sineoda-muted transition hover:text-white">
            ← Dergi
          </Link>
        )}

        <p className={`text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-accent ${isMember ? 'mt-4' : ''}`}>
          {formatJournalDate(post.publishedAt)} · {post.author}
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-5 text-lg leading-relaxed text-sineoda-muted">{post.excerpt}</p>
        )}

        {post.coverImage && (
          <img
            src={resolveMediaUrl(post.coverImage)}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-xl object-cover"
          />
        )}

        <div className="prose prose-invert mt-10 max-w-none space-y-5">
          {journalBodyParagraphs(post.body).map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="text-base leading-[1.8] text-white/85">
              {paragraph}
            </p>
          ))}
        </div>

        {linkedContent && (
          <div className="mt-12 rounded-xl border border-white/[0.08] bg-sineoda-surface p-5 sm:flex sm:items-center sm:gap-5">
            <img
              src={resolveMediaUrl(linkedContent.poster)}
              alt=""
              className="h-28 w-20 rounded-lg object-cover"
            />
            <div className="mt-4 sm:mt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sineoda-accent">
                İlgili içerik
              </p>
              <p className="mt-2 text-lg font-medium">{linkedContent.title}</p>
              {isMember && contentUI ? (
                <button
                  type="button"
                  onClick={() => void contentUI.openPlayer(linkedContent)}
                  className="mt-3 inline-flex rounded-md bg-sineoda-accent px-4 py-2 text-sm font-semibold text-sineoda-bg"
                >
                  İzle
                </button>
              ) : (
                <Link
                  to="/giris"
                  className="mt-3 inline-flex rounded-md bg-sineoda-accent px-4 py-2 text-sm font-semibold text-sineoda-bg"
                >
                  İzlemek için giriş yap
                </Link>
              )}
            </div>
          </div>
        )}
      </article>
    </>
  )
}
