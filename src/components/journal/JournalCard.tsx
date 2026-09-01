import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../../api/client'
import type { JournalPost } from '../../types/journal'
import { useLocale } from '../../i18n/LocaleContext'
import { formatJournalDate } from '../../utils/journal'

interface JournalCardProps {
  post: JournalPost
  featured?: boolean
  compact?: boolean
}

export function JournalCard({ post, featured = false, compact = false }: JournalCardProps) {
  const { localizePath, locale } = useLocale()

  return (
    <Link
      to={localizePath(`/dergi/${post.slug}`)}
      className={`group block overflow-hidden rounded-xl border border-white/[0.06] bg-plooy-surface transition hover:border-white/12 ${
        featured ? 'sm:grid sm:grid-cols-[1.1fr_1fr]' : ''
      }`}
    >
      <div
        className={`overflow-hidden ${
          featured ? 'sm:min-h-[280px]' : compact ? 'aspect-[16/10]' : 'aspect-[16/10]'
        }`}
      >
        <img
          src={resolveMediaUrl(post.coverImage)}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className={`flex flex-col justify-center ${compact ? 'p-4' : featured ? 'p-5 sm:p-8' : 'p-5 sm:p-6'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-plooy-accent">
          {formatJournalDate(post.publishedAt, locale)}
        </p>
        <h3
          className={`mt-2 font-semibold leading-snug text-white group-hover:text-plooy-accent ${
            featured ? 'mt-3 text-2xl sm:text-3xl' : compact ? 'line-clamp-2 text-base' : 'mt-3 text-lg'
          }`}
        >
          {post.title}
        </h3>
        <p
          className={`text-plooy-muted ${
            featured
              ? 'mt-3 text-base leading-relaxed'
              : compact
                ? 'mt-2 line-clamp-2 text-sm leading-relaxed'
                : 'mt-3 text-sm leading-relaxed'
          }`}
        >
          {post.excerpt}
        </p>
        <p className={`text-xs text-white/45 ${compact ? 'mt-3' : 'mt-4'}`}>{post.author}</p>
      </div>
    </Link>
  )
}
