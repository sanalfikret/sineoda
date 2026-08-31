import { useTranslation } from 'react-i18next'

interface JournalPaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function JournalPagination({ page, totalPages, total, onPageChange }: JournalPaginationProps) {
  const { t } = useTranslation('landing')

  if (totalPages <= 1) return null

  const pages = buildPageNumbers(page, totalPages)

  return (
    <nav
      className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8"
      aria-label={t('journal.paginationAria')}
    >
      <p className="text-sm text-plooy-muted">
        {t('journal.paginationSummary', { total, page, totalPages })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('journal.prev')}
        </button>
        {pages.map((item, index) =>
          item === '…' ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-white/40">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`min-w-10 rounded-lg px-3 py-2 text-sm transition ${
                item === page
                  ? 'bg-plooy-gold font-semibold text-plooy-bg'
                  : 'border border-white/10 text-white/80 hover:bg-white/5'
              }`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('journal.next')}
        </button>
      </div>
    </nav>
  )
}

function buildPageNumbers(current: number, total: number): Array<number | '…'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('…')
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push('…')
  pages.push(total)

  return pages
}
