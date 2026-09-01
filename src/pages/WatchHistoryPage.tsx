import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAllWatchProgress, fetchEpisodes } from '../api/client'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentCard } from '../components/ContentCard'
import { PageMeta } from '../components/PageMeta'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useLocale } from '../i18n/LocaleContext'
import type { ContentItem, Episode } from '../types/content'
import { isContentAllowedForKids } from '../utils/contentRating'
import {
  formatWatchPosition,
  isCompletedWatch,
  isInProgressWatch,
  watchProgressPercent,
} from '../utils/watchProgressUi'

type HistoryEntry = {
  contentId: string
  episodeId: string | null
  position: number
  duration: number
  updatedAt: string
  item: ContentItem
  episode?: Episode
}

function WatchHistoryContent() {
  const { t } = useTranslation('watchHistory')
  const { localizePath } = useLocale()
  const { activeProfile } = useAuth()
  const { getContentById, isContentVisible } = useContent()
  const { openDetail, openPlayer } = useContentUI()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeProfile) {
      setEntries([])
      setLoading(false)
      return
    }

    void (async () => {
      try {
        const { items } = await fetchAllWatchProgress()
        const episodeMap = new Map<string, Episode>()

        const contentIds = [...new Set(items.map((row) => row.contentId))]
        await Promise.all(
          contentIds.map(async (contentId) => {
            const needsEpisodes = items.some((row) => row.contentId === contentId && row.episodeId)
            if (!needsEpisodes) return
            try {
              const { episodes } = await fetchEpisodes(contentId)
              for (const ep of episodes) episodeMap.set(ep.id, ep)
            } catch {
              /* ignore */
            }
          }),
        )

        const rows: HistoryEntry[] = []
        for (const row of items) {
          if (row.position < 10 && row.duration > 0) continue
          const item = getContentById(row.contentId)
          if (!item || !isContentVisible(item)) continue
          if (activeProfile.isKids && !isContentAllowedForKids(item.rating)) continue
          rows.push({
            contentId: row.contentId,
            episodeId: row.episodeId,
            position: row.position,
            duration: row.duration,
            updatedAt: row.updatedAt ?? '',
            item,
            episode: row.episodeId ? episodeMap.get(row.episodeId) : undefined,
          })
        }

        rows.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
        setEntries(rows)
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    })()
  }, [activeProfile, getContentById, isContentVisible])

  const { inProgress, completed } = useMemo(() => {
    const progress: HistoryEntry[] = []
    const done: HistoryEntry[] = []
    for (const entry of entries) {
      if (isInProgressWatch(entry.position, entry.duration)) progress.push(entry)
      else if (isCompletedWatch(entry.position, entry.duration)) done.push(entry)
    }
    return { inProgress: progress, completed: done }
  }, [entries])

  const playEntry = (entry: HistoryEntry) => {
    if (entry.episode) {
      void openPlayer(entry.item, entry.episode)
      return
    }
    void openPlayer(entry.item)
  }

  const renderSection = (title: string, list: HistoryEntry[], continueMode: boolean) => {
    if (list.length === 0) return null
    return (
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {list.map((entry) => {
            const pct = watchProgressPercent(entry.position, entry.duration)
            return (
              <div key={`${entry.contentId}-${entry.episodeId ?? 'main'}`} className="space-y-2">
                <ContentCard item={entry.item} onSelect={openDetail} variant="grid" progressPercent={pct} />
                {entry.episode && (
                  <p className="truncate px-0.5 text-xs text-plooy-muted">
                    S{entry.episode.season} E{entry.episode.episodeNumber}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => playEntry(entry)}
                  className="w-full rounded-lg bg-plooy-gold/15 py-2 text-xs font-semibold text-plooy-gold transition hover:bg-plooy-gold/25 sm:text-sm"
                >
                  {continueMode
                    ? t('continue', { time: formatWatchPosition(entry.position) })
                    : t('watchAgain')}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <main className="px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <PageMeta title={t('title')} description={t('subtitle')} noIndex />
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{t('title')}</h1>
            <p className="mt-2 text-sm text-plooy-muted">{t('subtitle')}</p>
          </div>
          <Link
            to={localizePath('/hesap')}
            className="text-sm text-plooy-gold hover:underline"
          >
            {t('backToAccount')}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-plooy-surface px-6 py-16 text-center">
            <p className="text-lg font-medium text-white">{t('emptyTitle')}</p>
            <p className="mt-2 text-sm text-plooy-muted">{t('emptyBody')}</p>
          </div>
        ) : (
          <>
            {renderSection(t('sectionContinue'), inProgress, true)}
            {renderSection(t('sectionCompleted'), completed, false)}
          </>
        )}
      </div>
    </main>
  )
}

export function WatchHistoryPage() {
  return (
    <AppShell>
      <WatchHistoryContent />
    </AppShell>
  )
}
