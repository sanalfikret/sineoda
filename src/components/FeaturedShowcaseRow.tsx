import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ContentItem } from '../types/content'
import { useLocale } from '../i18n/LocaleContext'
import { ContentCard } from './ContentCard'

import { useBrowseLabels } from '../i18n/useBrowseLabels'
import { usesFeaturedShowcaseRow } from '../catalog/browseRowUi'

export const FEATURED_SHOWCASE_MAX_ITEMS = 6
export const FEATURED_SHOWCASE_COLUMNS = 3

export { usesFeaturedShowcaseRow }

interface FeaturedShowcaseRowProps {
  title: string
  items: ContentItem[]
  onSelect?: (item: ContentItem) => void
  guestMode?: boolean
  viewAllHref?: string
  className?: string
  progressMap?: Record<string, number>
}

function ShowcaseCard({
  item,
  onSelect,
  progressMap,
  variant,
  guestHref,
}: {
  item: ContentItem
  onSelect?: (item: ContentItem) => void
  progressMap?: Record<string, number>
  variant: 'carousel' | 'grid'
  guestHref?: string
}) {
  return (
    <ContentCard
      item={item}
      onSelect={onSelect ?? (() => undefined)}
      progressPercent={progressMap?.[item.id]}
      layout="landscape"
      forceLandscape
      variant={variant}
      guestHref={guestHref}
    />
  )
}

export function FeaturedShowcaseRow({
  title,
  items,
  onSelect,
  guestMode = false,
  viewAllHref,
  className = '',
  progressMap,
}: FeaturedShowcaseRowProps) {
  const { t } = useTranslation('browse')
  const { localizePath } = useLocale()
  const { translateCategory } = useBrowseLabels()

  if (items.length === 0) return null

  const visible = items.slice(0, FEATURED_SHOWCASE_MAX_ITEMS)
  const hasMore = items.length > FEATURED_SHOWCASE_MAX_ITEMS
  const loginHref = guestMode ? localizePath('/giris') : viewAllHref ? localizePath(viewAllHref) : undefined
  const showMoreLink = guestMode || Boolean(viewAllHref && hasMore)

  return (
    <section className={`overflow-hidden px-4 py-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="whitespace-pre-line text-lg font-semibold text-white sm:text-xl">
            {translateCategory(title)}
          </h2>
          {loginHref && (guestMode || hasMore) && (
            <Link to={loginHref} className="shrink-0 text-sm font-medium text-plooy-gold hover:underline">
              {t('viewAll')}
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {visible.map((item) => (
            <ShowcaseCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              progressMap={progressMap}
              variant="grid"
              guestHref={guestMode ? localizePath('/giris') : undefined}
            />
          ))}
        </div>

        <div className="hidden gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
          {visible.map((item) => (
            <ShowcaseCard
              key={item.id}
              item={item}
              onSelect={onSelect}
              progressMap={progressMap}
              variant="grid"
              guestHref={guestMode ? localizePath('/giris') : undefined}
            />
          ))}
        </div>

        {showMoreLink && loginHref && (
          <div className="mt-6 text-center">
            <Link
              to={loginHref}
              className="inline-flex items-center justify-center rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-5 py-2.5 text-sm font-semibold text-plooy-gold transition hover:bg-plooy-gold/20"
            >
              {guestMode ? t('loginToSeeMore') : t('viewAll')}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
