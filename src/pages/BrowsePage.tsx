import { useEffect, useMemo, useState } from 'react'
import type { ContentItem, ContentType } from '../types/content'
import { fetchAllWatchProgress, fetchEpisodes } from '../api/client'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentRow } from '../components/ContentRow'
import { GenreFilterBar } from '../components/GenreFilterBar'
import { Hero } from '../components/Hero'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useWatchlist } from '../context/WatchlistContext'
import { buildBrowseRows, filterCatalog, pickFeatured } from '../utils/browse'
import { getContentTypeLabel } from '../constants/contentTypes'

interface BrowsePageProps {
  contentType?: ContentType | null
  pageTitle?: string
}

function BrowseContent({ contentType = null, pageTitle }: BrowsePageProps) {
  const { openDetail, openPlayer } = useContentUI()
  const { categories, featuredContent, catalog, newReleases, getContentById, isLoading } = useContent()
  const { watchlistItems } = useWatchlist()
  const { activeProfile } = useAuth()
  const [activeGenre, setActiveGenre] = useState<string | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [resumeEpisodeMap, setResumeEpisodeMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!activeProfile) {
      setProgressMap({})
      setResumeEpisodeMap({})
      return
    }

    fetchAllWatchProgress()
      .then((data) => {
        const map: Record<string, number> = {}
        const episodeMap: Record<string, string> = {}
        for (const item of data.items) {
          if (item.duration <= 0 || item.position < 10) continue
          if (item.position >= item.duration - 30) continue
          const percent = (item.position / item.duration) * 100
          const key = item.contentId
          if (!map[key] || percent > map[key]) {
            map[key] = percent
            if (item.episodeId) episodeMap[key] = item.episodeId
          }
        }
        setProgressMap(map)
        setResumeEpisodeMap(episodeMap)
      })
      .catch(() => {
        setProgressMap({})
        setResumeEpisodeMap({})
      })
  }, [activeProfile])

  const browseOptions = useMemo(
    () => ({ type: contentType, genre: activeGenre }),
    [contentType, activeGenre],
  )

  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, browseOptions),
    [catalog, browseOptions],
  )

  const heroItem = useMemo(() => {
    if (activeGenre) {
      return filteredCatalog[0] ?? null
    }
    return pickFeatured(catalog, featuredContent, contentType)
  }, [catalog, featuredContent, contentType, activeGenre, filteredCatalog])

  const rows = useMemo(
    () => buildBrowseRows(categories, catalog, getContentById, browseOptions),
    [categories, catalog, getContentById, browseOptions],
  )

  const filteredWatchlist = useMemo(() => {
    let items = watchlistItems
    if (contentType) items = items.filter((item) => item.type === contentType)
    if (activeGenre) items = items.filter((item) => item.genres.includes(activeGenre))
    return items
  }, [watchlistItems, contentType, activeGenre])

  const continueWatching = useMemo(() => {
    if (!activeProfile) return []
    return filteredCatalog.filter((item) => {
      const percent = progressMap[item.id]
      return percent !== undefined && percent > 2
    })
  }, [filteredCatalog, progressMap, activeProfile])

  const filteredNewReleases = useMemo(() => {
    const items = newReleases.length > 0 ? newReleases : catalog.filter((item) => item.isNew)
    return filterCatalog(items, browseOptions)
  }, [newReleases, catalog, browseOptions])

  const handleContinue = async (item: ContentItem) => {
    const episodeId = resumeEpisodeMap[item.id]
    if (episodeId) {
      try {
        const { episodes } = await fetchEpisodes(item.id)
        const episode = episodes.find((ep) => ep.id === episodeId)
        if (episode) {
          openPlayer(item, episode)
          return
        }
      } catch {
        // fall through
      }
    }
    openPlayer(item)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  const displayHero = activeGenre ? filteredCatalog[0] : heroItem ?? catalog[0] ?? null

  if (!displayHero && !activeGenre) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="bg-sineoda-bg">
      {displayHero && (
      <Hero
        item={displayHero}
        onPlay={openPlayer}
        onDetails={openDetail}
        eyebrow={
          activeGenre
            ? activeGenre
            : pageTitle ?? (contentType ? getContentTypeLabel(contentType) : 'Senin İçin')
        }
      />
      )}

      <GenreFilterBar activeGenre={activeGenre} onChange={setActiveGenre} />

      <div className="space-y-2 pb-24 pt-4">
        {!activeGenre && !contentType && continueWatching.length > 0 && (
          <ContentRow
            title="Kaldığın Yerden Devam Et"
            items={continueWatching}
            onSelect={(item) => void handleContinue(item)}
            progressMap={progressMap}
          />
        )}

        {!activeGenre && !contentType && filteredNewReleases.length > 0 && (
          <ContentRow title="Yeni Eklenenler" items={filteredNewReleases} onSelect={openDetail} />
        )}

        {!activeGenre && !contentType && filteredWatchlist.length > 0 && (
          <ContentRow title="Listem" items={filteredWatchlist} onSelect={openDetail} />
        )}

        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sineoda-muted sm:px-6">
            Bu filtrede içerik bulunamadı.
          </p>
        ) : (
          rows.map((row) => (
            <ContentRow
              key={row.id}
              title={row.title}
              items={row.items}
              onSelect={openDetail}
              progressMap={progressMap}
            />
          ))
        )}
      </div>
    </main>
  )
}

export function BrowsePage(props: BrowsePageProps) {
  return (
    <AppShell>
      <BrowseContent {...props} />
    </AppShell>
  )
}
