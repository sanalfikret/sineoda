import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { JournalPost } from '../../types/journal'
import { formatJournalDate } from '../../utils/journal'

interface JournalCardProps {
  post: JournalPost
  featured?: boolean
}

export function JournalCard({ post, featured = false }: JournalCardProps) {
  return (
    <Link
      to={`/dergi/${post.slug}`}
      className={`group block overflow-hidden rounded-xl border border-white/[0.06] bg-sineoda-surface transition hover:border-white/12 ${
        featured ? 'sm:grid sm:grid-cols-[1.1fr_1fr]' : ''
      }`}
    >
      <div className={`overflow-hidden ${featured ? 'sm:min-h-[280px]' : 'aspect-[16/10]'}`}>
        <img
          src={resolveMediaUrl(post.coverImage)}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className={`flex flex-col justify-center p-5 sm:p-6 ${featured ? 'sm:p-8' : ''}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sineoda-accent">
          {formatJournalDate(post.publishedAt)}
        </p>
        <h3
          className={`mt-3 font-semibold leading-snug text-white group-hover:text-sineoda-accent ${
            featured ? 'text-2xl sm:text-3xl' : 'text-lg'
          }`}
        >
          {post.title}
        </h3>
        <p className={`mt-3 text-sineoda-muted ${featured ? 'text-base leading-relaxed' : 'text-sm leading-relaxed'}`}>
          {post.excerpt}
        </p>
        <p className="mt-4 text-xs text-white/45">{post.author}</p>
      </div>
    </Link>
  )
}
