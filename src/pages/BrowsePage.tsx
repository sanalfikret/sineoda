import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import type { ContentItem, ContentType } from '../types/content'
import { fetchAllWatchProgress, fetchEpisodes } from '../api/client'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentRow } from '../components/ContentRow'
import { StudentCinemaPicksRow } from '../components/StudentCinemaPicksRow'
import { GenreFilterBar } from '../components/GenreFilterBar'
import { Hero } from '../components/Hero'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useWatchlist } from '../context/WatchlistContext'
import { buildBrowseRows, filterCatalog, genresForCatalog, pickFeatured } from '../utils/browse'
import { restoreBrowseScroll } from '../utils/browseState'
import { isVerticalContent } from '../utils/vertical'
import { getContentTypeLabel } from '../constants/contentTypes'
import { isContentAllowedForKids } from '../utils/contentRating'

interface BrowsePageProps {
  contentType?: ContentType | null
  pageTitle?: string
  verticalOnly?: boolean
  studentCinemaOnly?: boolean
}

function BrowseContent({
  contentType = null,
  pageTitle,
  verticalOnly = false,
  studentCinemaOnly = false,
}: BrowsePageProps) {
  const { openDetail, openPlayer } = useContentUI()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories, featuredContent, catalog, getContentById, isLoading, refresh, studentCinemaPicks } = useContent()
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
    if (contentType || verticalOnly) return
    void refresh()
  }, [contentType, verticalOnly, refresh])

  useEffect(() => {
    const onFocus = () => {
      if (contentType || verticalOnly) return
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [contentType, verticalOnly, refresh])

  const genreOptions = useMemo(
    () =>
      genresForCatalog(catalog, {
        type: contentType,
        verticalOnly,
        genre: null,
        kidsSafe: Boolean(activeProfile?.isKids),
      }),
    [catalog, contentType, verticalOnly, activeProfile?.isKids],
  )

  useEffect(() => {
    if (!activeGenre || genreOptions.length === 0) return
    if (!genreOptions.includes(activeGenre as (typeof genreOptions)[number])) {
      const next = new URLSearchParams(searchParams)
      next.delete('tur')
      setSearchParams(next, { replace: true })
    }
  }, [activeGenre, genreOptions, searchParams, setSearchParams])

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
    () => ({
      type: studentCinemaOnly ? null : contentType,
      genre: studentCinemaOnly ? null : activeGenre,
      verticalOnly: studentCinemaOnly ? false : verticalOnly,
      kidsSafe: Boolean(activeProfile?.isKids),
      studentOnly: studentCinemaOnly,
    }),
    [contentType, activeGenre, verticalOnly, activeProfile?.isKids, studentCinemaOnly],
  )

  const filteredCatalog = useMemo(
    () => filterCatalog(catalog, browseOptions),
    [catalog, browseOptions],
  )

  const heroItem = useMemo(() => {
    if (studentCinemaOnly) {
      return filteredCatalog[0] ?? null
    }
    if (activeGenre) {
      return filteredCatalog[0] ?? null
    }
    const pool = activeProfile?.isKids ? filteredCatalog : catalog
    const featured = activeProfile?.isKids
      ? featuredContent && isContentAllowedForKids(featuredContent.rating)
        ? featuredContent
        : null
      : featuredContent
    return pickFeatured(pool, featured, contentType, verticalOnly)
  }, [
    catalog,
    featuredContent,
    contentType,
    activeGenre,
    filteredCatalog,
    verticalOnly,
    activeProfile?.isKids,
    studentCinemaOnly,
  ])

  const rows = useMemo(
    () => buildBrowseRows(catalog, browseOptions, categories, getContentById),
    [catalog, browseOptions, categories, getContentById],
  )

  const handleSelect = verticalOnly
    ? (item: ContentItem) => void openPlayer(item)
    : openDetail

  const rowLayout = (rowTitle: string, items: ContentItem[]) => {
    if (verticalOnly) return 'portrait' as const
    if (rowTitle === 'Dikey Diziler' || items.every(isVerticalContent)) return 'portrait' as const
    return 'landscape' as const
  }

  const rowSelect = (rowTitle: string) => {
    if (verticalOnly || rowTitle === 'Dikey Diziler') {
      return (item: ContentItem) => void openPlayer(item)
    }
    return handleSelect
  }

  const filteredWatchlist = useMemo(() => {
    let items = watchlistItems
    if (activeProfile?.isKids) {
      items = items.filter((item) => isContentAllowedForKids(item.rating))
    }
    if (contentType) items = items.filter((item) => item.type === contentType)
    if (activeGenre) items = items.filter((item) => item.genres.includes(activeGenre))
    return items
  }, [watchlistItems, contentType, activeGenre, activeProfile?.isKids])

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

  const displayHero = activeGenre ? filteredCatalog[0] : heroItem ?? filteredCatalog[0] ?? null

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="bg-sineoda-bg">
      {displayHero ? (
      <Hero
        item={displayHero}
        onPlay={openPlayer}
        onDetails={verticalOnly ? (item) => void openPlayer(item) : openDetail}
        eyebrow={
          studentCinemaOnly
            ? 'Genç Sinema'
            : activeGenre
            ? activeGenre
            : pageTitle ?? (verticalOnly ? 'Dikey Diziler' : contentType ? getContentTypeLabel(contentType) : 'Senin İçin')
        }
      />
      ) : (
        <div className="px-4 pb-4 pt-28 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {pageTitle ?? (verticalOnly ? 'Dikey Diziler' : contentType ? getContentTypeLabel(contentType) : 'Senin İçin')}
          </h1>
        </div>
      )}

      <GenreFilterBar
        activeGenre={studentCinemaOnly ? null : activeGenre}
        genres={studentCinemaOnly ? [] : genreOptions}
        onChange={setActiveGenre}
      />

      {studentCinemaOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-emerald-100/70 sm:px-6">
          Sinema okullarından mezun ve öğrenci filmleri — yalnızca Genç Sinema seçkisinde.
        </p>
      )}

      <div className="pb-24 pt-2">
        {!activeGenre && !contentType && !verticalOnly && !studentCinemaOnly && studentCinemaPicks.length > 0 && (
          <StudentCinemaPicksRow items={studentCinemaPicks} onSelect={openDetail} />
        )}

        {!activeGenre && !contentType && continueWatching.length > 0 && (
          <ContentRow
            title="Kaldığın Yerden Devam Et"
            items={continueWatching}
            onSelect={(item) => void handleContinue(item)}
            progressMap={progressMap}
          />
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
              onSelect={rowSelect(row.title)}
              progressMap={progressMap}
              viewAllHref={
                !activeGenre && !contentType && row.title === 'Dikey Diziler'
                  ? '/dikey-diziler'
                  : undefined
              }
              prominent={row.title === 'Dikey Diziler'}
              layout={rowLayout(row.title, row.items)}
              variant={activeGenre || contentType || verticalOnly || studentCinemaOnly ? 'grid' : 'carousel'}
            />
          ))
        )}

        {!activeGenre && !contentType && filteredWatchlist.length > 0 && (
          <ContentRow title="Listem" items={filteredWatchlist} onSelect={openDetail} />
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
