import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
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
import { restoreBrowseScroll } from '../utils/browseState'
import { filterVerticalCatalog } from '../utils/vertical'
import { getContentTypeLabel } from '../constants/contentTypes'

interface BrowsePageProps {
  contentType?: ContentType | null
  pageTitle?: string
  verticalOnly?: boolean
}

function BrowseContent({ contentType = null, pageTitle, verticalOnly = false }: BrowsePageProps) {
  const { openDetail, openPlayer } = useContentUI()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories, featuredContent, catalog, getContentById, isLoading } = useContent()
  const { watchlistItems } = useWatchlist()
  const { activeProfile } = useAuth()
  const activeGenre = searchParams.get('tur')
  const [progressMap, setProgressMap] = useState<Record<string, number>>({})
  const [resumeEpisodeMap, setResumeEpisodeMap] = useState<Record<string, string>>({})

  const setActiveGenre = (genre: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (genre) next.set('tur', genre)
    else next.delete('tur')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    if (isLoading) return
    restoreBrowseScroll(location.pathname, location.search)
  }, [isLoading, location.pathname, location.search])

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
    () => ({ type: contentType, genre: activeGenre, verticalOnly }),
    [contentType, activeGenre, verticalOnly],
  )

  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, browseOptions),
    [catalog, browseOptions],
  )

  const heroItem = useMemo(() => {
    if (activeGenre) {
      return filteredCatalog[0] ?? null
    }
    return pickFeatured(catalog, featuredContent, contentType, verticalOnly)
  }, [catalog, featuredContent, contentType, activeGenre, filteredCatalog, verticalOnly])

  const verticalItems = useMemo(() => filterVerticalCatalog(catalog), [catalog])

  const rows = useMemo(
    () => buildBrowseRows(catalog, browseOptions, categories, getContentById),
    [catalog, browseOptions, categories, getContentById],
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

  const handleSelect = verticalOnly
    ? (item: ContentItem) => void openPlayer(item)
    : openDetail

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
        onDetails={verticalOnly ? (item) => void openPlayer(item) : openDetail}
        eyebrow={
          activeGenre
            ? activeGenre
            : pageTitle ?? (verticalOnly ? 'Dikey Diziler' : contentType ? getContentTypeLabel(contentType) : 'Senin İçin')
        }
      />
      )}

      <GenreFilterBar activeGenre={activeGenre} onChange={setActiveGenre} />

      <div className="pb-24 pt-2">
        {!activeGenre && !contentType && !verticalOnly && verticalItems.length > 0 && (
          <ContentRow
            title="Dikey Diziler"
            items={verticalItems}
            onSelect={(item) => void openPlayer(item)}
            progressMap={progressMap}
            viewAllHref="/dikey-diziler"
            prominent
            layout="portrait"
          />
        )}

        {!activeGenre && !contentType && continueWatching.length > 0 && (
          <ContentRow
            title="Kaldığın Yerden Devam Et"
            items={continueWatching}
            onSelect={(item) => void handleContinue(item)}
            progressMap={progressMap}
          />
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
              onSelect={handleSelect}
              progressMap={progressMap}
              layout={verticalOnly ? 'portrait' : 'landscape'}
              variant={activeGenre ? 'grid' : 'carousel'}
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
