import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ContentItem, ContentType } from '../types/content'
import { fetchAllWatchProgress, fetchEpisodes } from '../api/client'
import { AppShell, useContentUI } from '../components/AppShell'
import { ContentRow } from '../components/ContentRow'
import { GenreFilterBar } from '../components/GenreFilterBar'
import { Hero } from '../components/Hero'
import { PageMeta } from '../components/PageMeta'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../context/ContentContext'
import { useWatchlist } from '../context/WatchlistContext'
import { buildBrowseRows, filterCatalog, genresForCatalog, pickFeatured, STUDENT_MONTHLY_WINNERS_ROW_ID } from '../utils/browse'
import { FeaturedShowcaseRow } from '../components/FeaturedShowcaseRow'
import { browseRowLayout, browseRowOpensPlayer, browseRowViewAllPath, usesFeaturedShowcaseRow } from '../catalog/browseRowUi'
import { restoreBrowseScroll } from '../utils/browseState'
import { isContentAllowedForKids } from '../utils/contentRating'
import { useLocale } from '../i18n/LocaleContext'
import { useBrowseLabels } from '../i18n/useBrowseLabels'

interface BrowsePageProps {
  contentType?: ContentType | null
  verticalOnly?: boolean
  studentCinemaOnly?: boolean
  cekimNotlariOnly?: boolean
  classicsOnly?: boolean
}

function BrowseContent({
  contentType = null,
  verticalOnly = false,
  studentCinemaOnly = false,
  cekimNotlariOnly = false,
  classicsOnly = false,
}: BrowsePageProps) {
  const { t } = useTranslation('browse')
  const { localizePath } = useLocale()
  const { translateGenre, translateContentType } = useBrowseLabels()
  const { openDetail, openPlayer } = useContentUI()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { visibleCategories, featuredContent, visibleCatalog, getContentById, isLoading, refresh, studentCinemaPicks, studentCinemaCatalog, studentCinemaMonthlyWinners, hiddenNavIds, categoryOrder } = useContent()
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
    if (contentType || verticalOnly || cekimNotlariOnly || classicsOnly) return
    void refresh()
  }, [contentType, verticalOnly, cekimNotlariOnly, classicsOnly, refresh])

  useEffect(() => {
    const onFocus = () => {
      if (contentType || verticalOnly || cekimNotlariOnly || classicsOnly) return
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [contentType, verticalOnly, cekimNotlariOnly, classicsOnly, refresh])

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
      type: studentCinemaOnly || cekimNotlariOnly || classicsOnly ? null : contentType,
      genre: studentCinemaOnly || cekimNotlariOnly || classicsOnly ? null : activeGenre,
      verticalOnly: studentCinemaOnly || cekimNotlariOnly || classicsOnly ? false : verticalOnly,
      kidsSafe: Boolean(activeProfile?.isKids),
      studentOnly: studentCinemaOnly,
      cekimNotlariOnly,
      classicsOnly,
    }),
    [contentType, activeGenre, verticalOnly, activeProfile?.isKids, studentCinemaOnly, cekimNotlariOnly, classicsOnly],
  )

  const filteredCatalog = useMemo(() => {
    const source = studentCinemaOnly ? studentCinemaCatalog : visibleCatalog
    return filterCatalog(source, browseOptions)
  }, [studentCinemaOnly, studentCinemaCatalog, visibleCatalog, browseOptions])

  const rows = useMemo(() => {
    const source = studentCinemaOnly ? studentCinemaCatalog : visibleCatalog
    return buildBrowseRows(source, browseOptions, visibleCategories, getContentById, {
      studentCinemaPicks,
      studentCinemaMonthlyWinners,
      categoryOrder,
    })
  }, [
    studentCinemaOnly,
    studentCinemaCatalog,
    visibleCatalog,
    browseOptions,
    visibleCategories,
    getContentById,
    studentCinemaPicks,
    studentCinemaMonthlyWinners,
    categoryOrder,
  ])

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
    if (classicsOnly) {
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
    classicsOnly,
    rows,
  ])

  const handleSelect = verticalOnly
    ? (item: ContentItem) => void openPlayer(item)
    : openDetail

  const rowLayout = (rowId: string, _rowTitle: string, items: ContentItem[]) =>
    browseRowLayout(rowId, items, verticalOnly)

  const rowSelect = (rowId: string) => {
    if (browseRowOpensPlayer(rowId, verticalOnly)) {
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
  const isBrowseList = Boolean(activeGenre || contentType || verticalOnly || studentCinemaOnly || classicsOnly)
  const showSectionExtras = !cekimNotlariOnly && !classicsOnly

  const resolvedPageTitle = useMemo(() => {
    if (verticalOnly) return t('dikey')
    if (studentCinemaOnly) return t('gencSinema')
    if (cekimNotlariOnly) return t('cekimNotlari')
    if (classicsOnly) return t('klasikler')
    if (contentType === 'dizi') return t('diziler')
    if (contentType === 'film') return t('filmler')
    if (contentType === 'belgesel') return t('belgeseller')
    if (contentType === 'stand-up') return t('standup')
    if (contentType === 'kisa-film') return t('kisaFilmler')
    return t('forYou')
  }, [verticalOnly, studentCinemaOnly, cekimNotlariOnly, classicsOnly, contentType, t])

  const contentTypeLabel = (type: ContentType | string) => translateContentType(type)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  const browseMetaTitle = resolvedPageTitle

  return (
    <main className="bg-plooy-bg">
      <PageMeta title={browseMetaTitle} path={location.pathname} />
      {displayHero ? (
      <Hero
        item={displayHero}
        onPlay={openPlayer}
        onDetails={verticalOnly ? (item) => void openPlayer(item) : openDetail}
        eyebrow={
          cekimNotlariOnly
            ? t('cekimSectionTitle')
            : studentCinemaOnly
            ? t('gencSinema')
            : classicsOnly
            ? t('klasikler')
            : activeGenre
            ? translateGenre(activeGenre)
            : contentType
            ? contentTypeLabel(contentType)
            : resolvedPageTitle
        }
      />
      ) : (
        <div className="px-4 pb-4 pt-28 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {resolvedPageTitle}
          </h1>
        </div>
      )}

      <GenreFilterBar
        activeGenre={studentCinemaOnly || cekimNotlariOnly || classicsOnly ? null : activeGenre}
        genres={studentCinemaOnly || cekimNotlariOnly || classicsOnly ? [] : genreOptions}
        onChange={setActiveGenre}
      />

      {studentCinemaOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-emerald-100/70 sm:px-6">
          {t('studentCinemaDesc')}
        </p>
      )}

      {cekimNotlariOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-plooy-muted sm:px-6">
          {t('cekimNotlariDesc')}
        </p>
      )}

      {classicsOnly && (
        <p className="mx-auto max-w-3xl px-4 pb-2 text-center text-sm text-plooy-muted sm:px-6">
          {t('classicsDesc')}
        </p>
      )}

      <div className="mobile-page-bottom pb-8">
        {showSectionExtras && !activeGenre && !contentType && continueWatching.length > 0 && (
          <ContentRow
            title={t('continueWatching')}
            items={continueWatching}
            onSelect={(item) => void handleContinue(item)}
            progressMap={progressMap}
          />
        )}

        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-plooy-muted sm:px-6">
            {t('noContent')}
          </p>
        ) : (
          rows.map((row) => {
            const viewAllPath = browseRowViewAllPath(row.id, {
              activeGenre,
              contentType,
              hiddenNavIds,
            })
            const viewAllHref = viewAllPath ? localizePath(viewAllPath) : undefined

            if (!isBrowseList && usesFeaturedShowcaseRow(row.title, row.id)) {
              return (
                <FeaturedShowcaseRow
                  key={row.id}
                  title={row.title}
                  items={row.items}
                  onSelect={rowSelect(row.id)}
                  progressMap={progressMap}
                  viewAllHref={viewAllHref}
                />
              )
            }

            return (
            <ContentRow
              key={row.id}
              title={row.title}
              items={row.items}
              onSelect={rowSelect(row.id)}
              progressMap={progressMap}
              viewAllHref={viewAllHref}
              prominent={false}
              layout={rowLayout(row.id, row.title, row.items)}
              variant={isBrowseList ? 'grid' : 'carousel'}
              gridFixedWidth={isBrowseList}
            />
            )
          })
        )}

        {showSectionExtras && !activeGenre && !contentType && !hiddenNavIds.includes('listem') && filteredWatchlist.length > 0 && (
          <ContentRow title={t('myList')} items={filteredWatchlist} onSelect={openDetail} />
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
