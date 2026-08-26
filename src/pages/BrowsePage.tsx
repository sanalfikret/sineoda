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
import { buildBrowseRows, filterCatalog, genresForCatalog, pickFeatured, STUDENT_MONTHLY_WINNERS_ROW_ID } from '../utils/browse'
import { BRAND_STUDENT_CINEMA } from '../constants/brand'
import { restoreBrowseScroll } from '../utils/browseState'
import { isVerticalContent } from '../utils/vertical'
import { getContentTypeLabel } from '../constants/contentTypes'
import { isContentAllowedForKids } from '../utils/contentRating'
import { CEKIM_NOTLARI_SECTION_TITLE } from '../constants/cekimNotlari'

interface BrowsePageProps {
  contentType?: ContentType | null
  pageTitle?: string
  verticalOnly?: boolean
  studentCinemaOnly?: boolean
  cekimNotlariOnly?: boolean
}

function BrowseContent({
  contentType = null,
  pageTitle,
  verticalOnly = false,
  studentCinemaOnly = false,
  cekimNotlariOnly = false,
}: BrowsePageProps) {
  const { openDetail, openPlayer } = useContentUI()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { visibleCategories, featuredContent, visibleCatalog, getContentById, isLoading, refresh, studentCinemaPicks, studentCinemaMonthlyWinners, hiddenNavIds } = useContent()
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
    if (contentType || verticalOnly || cekimNotlariOnly) return
    void refresh()
  }, [contentType, verticalOnly, cekimNotlariOnly, refresh])

  useEffect(() => {
    const onFocus = () => {
      if (contentType || verticalOnly || cekimNotlariOnly) return
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [contentType, verticalOnly, cekimNotlariOnly, refresh])

  const genreOptions = useMemo(
    () =>
      genresForCatalog(visibleCatalog, {
        type: contentType,
        verticalOnly,
        genre: null,
        kidsSafe: Boolean(activeProfile?.isKids),
      }),
    [visibleCatalog, contentType, verticalOnly, activeProfile?.isKids],
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
      type: studentCinemaOnly || cekimNotlariOnly ? null : contentType,
      genre: studentCinemaOnly || cekimNotlariOnly ? null : activeGenre,
      verticalOnly: studentCinemaOnly || cekimNotlariOnly ? false : verticalOnly,
      kidsSafe: Boolean(activeProfile?.isKids),
      studentOnly: studentCinemaOnly,
      cekimNotlariOnly,
    }),
    [contentType, activeGenre, verticalOnly, activeProfile?.isKids, studentCinemaOnly, cekimNotlariOnly],
  )

  const filteredCatalog = useMemo(
    () => filterCatalog(visibleCatalog, browseOptions),
    [visibleCatalog, browseOptions],
  )

  const rows = useMemo(
    () =>
      buildBrowseRows(visibleCatalog, browseOptions, visibleCategories, getContentById, {
        studentCinemaPicks,
        studentCinemaMonthlyWinners,
      }),
    [visibleCatalog, browseOptions, visibleCategories, getContentById, studentCinemaPicks, studentCinemaMonthlyWinners],
  )

  const heroItem = useMemo(() => {
    if (cekimNotlariOnly) {
      for (const row of rows) {
        if (row.items[0]) return row.items[0]
      }
      return null
    }
    if (studentCinemaOnly) {
      return filteredCatalog[0] ?? null
    }
    if (activeGenre) {
      return filteredCatalog[0] ?? null
    }
    const pool = activeProfile?.isKids ? filteredCatalog : visibleCatalog
    const featured = activeProfile?.isKids
      ? featuredContent && isContentAllowedForKids(featuredContent.rating)
        ? featuredContent
        : null
      : featuredContent
    return pickFeatured(pool, featured, contentType, verticalOnly)
  }, [
    visibleCatalog,
    featuredContent,
    contentType,
    activeGenre,
    filteredCatalog,
    verticalOnly,
    activeProfile?.isKids,
    studentCinemaOnly,
    cekimNotlariOnly,
    rows,
  ])

  const handleSelect = verticalOnly
    ? (item: ContentItem) => void openPlayer(item)
    : openDetail

  const rowLayout = (_rowId: string, rowTitle: string, items: ContentItem[]) => {
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
    let items = watchlistItems.filter((item) => visibleCatalog.some((entry) => entry.id === item.id))
    if (activeProfile?.isKids) {
      items = items.filter((item) => isContentAllowedForKids(item.rating))
    }
    if (contentType) items = items.filter((item) => item.type === contentType)
    if (activeGenre) items = items.filter((item) => item.genres.includes(activeGenre))
    return items
  }, [watchlistItems, visibleCatalog, contentType, activeGenre, activeProfile?.isKids])

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

  const displayHero = cekimNotlariOnly
    ? heroItem
    : activeGenre
      ? filteredCatalog[0]
      : heroItem ?? filteredCatalog[0] ?? null
  const isBrowseList = Boolean(activeGenre || contentType || verticalOnly || studentCinemaOnly)
  const showSectionExtras = !cekimNotlariOnly

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
          cekimNotlariOnly
            ? CEKIM_NOTLARI_SECTION_TITLE
            : studentCinemaOnly
            ? 'Genç Sinema'
            : activeGenre
            ? activeGenre
            : pageTitle ?? (verticalOnly ? 'Dikey Diziler' : contentType ? getContentTypeLabel(contentType) : 'Senin İçin')
        }
      />
      ) : (
        <div className="px-4 pb-4 pt-28 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {pageTitle ?? (verticalOnly ? 'Dikey Diziler' : contentType ? getContentTypeLabel(contentType) : cekimNotlariOnly ? 'Çekim Notları' : 'Senin İçin')}
          </h1>
        </div>
      )}

      <GenreFilterBar
        activeGenre={studentCinemaOnly || cekimNotlariOnly ? null : activeGenre}
        genres={studentCinemaOnly || cekimNotlariOnly ? [] : genreOptions}
        onChange={setActiveGenre}
      />

      {studentCinemaOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-emerald-100/70 sm:px-6">
          Sinema okullarından mezun ve öğrenci filmleri — yalnızca Genç Sinema seçkisinde.
        </p>
      )}

      {cekimNotlariOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-sineoda-muted sm:px-6">
          Alanında uzman isimlerden eğitici videolar — setten post prodüksiyona.
        </p>
      )}

      <div className="pb-24">
        {showSectionExtras && !activeGenre && !contentType && continueWatching.length > 0 && (
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
                !activeGenre &&
                !contentType &&
                row.id === BRAND_STUDENT_CINEMA.id &&
                !hiddenNavIds.includes('gencSinema')
                  ? '/genc-sinema'
                  : !activeGenre &&
                      !contentType &&
                      row.id === STUDENT_MONTHLY_WINNERS_ROW_ID &&
                      !hiddenNavIds.includes('gencSinema')
                    ? '/genc-sinema'
                    : !activeGenre &&
                        !contentType &&
                        row.title === 'Dikey Diziler' &&
                        !hiddenNavIds.includes('dikey')
                      ? '/dikey-diziler'
                      : undefined
              }
              prominent={false}
              layout={rowLayout(row.id, row.title, row.items)}
              variant={isBrowseList ? 'grid' : 'carousel'}
              gridFixedWidth={isBrowseList}
            />
          ))
        )}

        {showSectionExtras && !activeGenre && !contentType && !hiddenNavIds.includes('listem') && filteredWatchlist.length > 0 && (
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
