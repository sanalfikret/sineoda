import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, fetchBootstrap, seedCekimNotlariCache, updateAdminSiteNav, type CekimNotlariSection } from '../api/client'
import { DEFAULT_SITE_NAV, type SiteNavId } from '../constants/siteNav'
import { mergeWithDemoCatalog } from '../data/demoLandingPosters'
import type { ContentCategory, ContentItem } from '../types/content'
import {
  deriveHiddenNavFromCategories,
  filterCatalogByNavVisibility,
  filterVisibleCategories,
  isContentBlockedByNav,
} from '../utils/navVisibility'
import { isPlatformMainContent } from '../utils/contentPools'

interface ContentContextValue {
  catalog: ContentItem[]
  visibleCatalog: ContentItem[]
  categories: ContentCategory[]
  visibleCategories: ContentCategory[]
  categoryOrder: string[]
  hiddenNavIds: SiteNavId[]
  featuredContent: ContentItem | null
  trailers: ContentItem[]
  newReleases: ContentItem[]
  studentCinemaPicks: ContentItem[]
  studentCinemaCatalog: ContentItem[]
  studentCinemaMonthlyWinners: ContentItem[]
  cekimNotlariSections: CekimNotlariSection[]
  isLoading: boolean
  refresh: () => Promise<void>
  getContentById: (id: string) => ContentItem | undefined
  isContentVisible: (item: ContentItem) => boolean
  addContent: (item: Omit<ContentItem, 'id'> & { id?: string }) => Promise<ContentItem>
  updateContent: (id: string, updates: Partial<ContentItem>) => Promise<void>
  deleteContent: (id: string) => Promise<void>
  setFeatured: (id: string) => Promise<void>
  addCategory: (title: string) => Promise<ContentCategory>
  updateCategory: (
    id: string,
    updates: Partial<Pick<ContentCategory, 'title' | 'itemIds' | 'hidden'>>,
  ) => Promise<ContentCategory>
  updateSiteNavVisibility: (hidden: SiteNavId[]) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (orderedIds: string[]) => Promise<ContentCategory[]>
  resetToSeed: () => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [categoryOrder, setCategoryOrder] = useState<string[]>([])
  const [hiddenNavIds, setHiddenNavIds] = useState<SiteNavId[]>(DEFAULT_SITE_NAV.hidden)
  const [featuredContent, setFeaturedContent] = useState<ContentItem | null>(null)
  const [trailers, setTrailers] = useState<ContentItem[]>([])
  const [newReleases, setNewReleases] = useState<ContentItem[]>([])
  const [studentCinemaPicks, setStudentCinemaPicks] = useState<ContentItem[]>([])
  const [studentCinemaCatalog, setStudentCinemaCatalog] = useState<ContentItem[]>([])
  const [studentCinemaMonthlyWinners, setStudentCinemaMonthlyWinners] = useState<ContentItem[]>([])
  const [cekimNotlariSections, setCekimNotlariSections] = useState<CekimNotlariSection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await fetchBootstrap()
    setCatalog(mergeWithDemoCatalog(data.catalog))
    setCategories(data.categories)
    setCategoryOrder(data.categoryOrder ?? data.categories.map((category) => category.id))
    setHiddenNavIds(data.siteNav?.hidden ?? deriveHiddenNavFromCategories(data.categories))
    setFeaturedContent(data.featuredContent)
    setTrailers(data.trailers ?? [])
    setNewReleases(data.newReleases ?? [])
    setStudentCinemaPicks(data.studentCinemaPicks ?? [])
    setStudentCinemaCatalog(data.studentCinemaCatalog ?? data.studentCinemaPicks ?? [])
    setStudentCinemaMonthlyWinners(data.studentCinemaMonthlyWinners ?? [])
    if (data.cekimNotlari?.sections) {
      setCekimNotlariSections(data.cekimNotlari.sections)
      seedCekimNotlariCache(data.cekimNotlari)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        await refresh()
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [refresh])

  const isContentVisible = useCallback(
    (item: ContentItem) => !isContentBlockedByNav(item, hiddenNavIds),
    [hiddenNavIds],
  )

  const platformCatalog = useMemo(
    () => catalog.filter((item) => isPlatformMainContent(item)),
    [catalog],
  )

  const visibleCatalog = useMemo(
    () => filterCatalogByNavVisibility(platformCatalog, hiddenNavIds),
    [platformCatalog, hiddenNavIds],
  )

  const cekimNotlariItems = useMemo(
    () => cekimNotlariSections.flatMap((section) => section.items),
    [cekimNotlariSections],
  )

  const visibleCategories = useMemo(() => filterVisibleCategories(categories), [categories])

  const getContentById = useCallback(
    (id: string): ContentItem | undefined => {
      const fromCatalog = platformCatalog.find((item) => item.id === id)
      const fromStudent = studentCinemaCatalog.find((item) => item.id === id)
      const fromPicks = studentCinemaPicks.find((item) => item.id === id)
      const fromWinners = studentCinemaMonthlyWinners.find((item) => item.id === id)
      const fromCekim = cekimNotlariItems.find((item) => item.id === id)
      const base = fromCatalog ?? fromStudent ?? fromPicks ?? fromWinners ?? fromCekim
      if (!base) return undefined

      const merged: ContentItem = {
        ...base,
        ...fromCatalog,
        ...fromStudent,
        ...fromPicks,
        ...fromWinners,
        ...fromCekim,
        credits:
          fromPicks?.credits ??
          fromWinners?.credits ??
          fromStudent?.credits ??
          fromCatalog?.credits ??
          base.credits,
        monthlyAward:
          fromWinners?.monthlyAward ??
          fromPicks?.monthlyAward ??
          fromStudent?.monthlyAward ??
          fromCatalog?.monthlyAward ??
          base.monthlyAward,
      }

      if (isContentBlockedByNav(merged, hiddenNavIds)) return undefined
      return merged
    },
    [
      platformCatalog,
      studentCinemaCatalog,
      studentCinemaPicks,
      studentCinemaMonthlyWinners,
      cekimNotlariItems,
      hiddenNavIds,
    ],
  )

  const addContent = useCallback(
    async (item: Omit<ContentItem, 'id'> & { id?: string }) => {
      const result = await api<{ item: ContentItem }>('/api/content', {
        method: 'POST',
        body: JSON.stringify(item),
      })
      await refresh()
      return result.item
    },
    [refresh],
  )

  const updateContent = useCallback(
    async (id: string, updates: Partial<ContentItem>) => {
      await api(`/api/content/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      await refresh()
    },
    [refresh],
  )

  const deleteContent = useCallback(
    async (id: string) => {
      await api(`/api/content/${id}`, { method: 'DELETE' })
      await refresh()
    },
    [refresh],
  )

  const setFeatured = useCallback(
    async (id: string) => {
      await api(`/api/content/${id}/featured`, { method: 'POST' })
      await refresh()
    },
    [refresh],
  )

  const addCategory = useCallback(
    async (title: string) => {
      const result = await api<{
        category: ContentCategory
        categories?: ContentCategory[]
        categoryOrder?: string[]
      }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })
      if (result.categories?.length) {
        setCategories(result.categories)
      } else {
        setCategories((prev) => [...prev, result.category])
      }
      if (result.categoryOrder?.length) {
        setCategoryOrder(result.categoryOrder)
      } else {
        setCategoryOrder((prev) =>
          prev.includes(result.category.id) ? prev : [...prev, result.category.id],
        )
      }
      return result.category
    },
    [],
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Pick<ContentCategory, 'title' | 'itemIds' | 'hidden'>>) => {
      const result = await api<{
        category: ContentCategory
        categories?: ContentCategory[]
        siteNav?: { hidden: SiteNavId[] }
      }>(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })

      if (updates.hidden !== undefined) {
        let nextCategories = result.categories
        if (!nextCategories?.length) {
          const all = await api<{ categories: ContentCategory[] }>('/api/categories')
          nextCategories = all.categories
        }
        setCategories(nextCategories)
        setHiddenNavIds(result.siteNav?.hidden ?? deriveHiddenNavFromCategories(nextCategories))
      } else {
        setCategories((prev) =>
          prev.map((entry) => (entry.id === id ? result.category : entry)),
        )
      }

      return result.category
    },
    [],
  )

  const updateSiteNavVisibility = useCallback(async (hidden: SiteNavId[]) => {
    const previousHidden = hiddenNavIds
    const previousCategories = categories
    setHiddenNavIds(hidden)
    try {
      const result = await updateAdminSiteNav(hidden)
      setHiddenNavIds(result.siteNav.hidden)
      setCategories(result.categories)
    } catch (error) {
      setHiddenNavIds(previousHidden)
      setCategories(previousCategories)
      throw error
    }
  }, [hiddenNavIds, categories])

  const deleteCategory = useCallback(
    async (id: string) => {
      const result = await api<{
        categories: ContentCategory[]
        categoryOrder?: string[]
      }>(`/api/categories/${id}`, { method: 'DELETE' })
      setCategories(result.categories)
      if (result.categoryOrder?.length) {
        setCategoryOrder(result.categoryOrder)
      } else {
        setCategoryOrder((prev) => prev.filter((entry) => entry !== id))
      }
    },
    [],
  )

  const reorderCategories = useCallback(async (orderedIds: string[]) => {
    const result = await api<{ categories: ContentCategory[]; categoryOrder?: string[] }>(
      '/api/categories/reorder',
      {
        method: 'PUT',
        body: JSON.stringify({ orderedIds }),
      },
    )
    setCategories(result.categories)
    setCategoryOrder(result.categoryOrder ?? orderedIds)
    return result.categories
  }, [])

  const resetToSeed = useCallback(async () => {
    await api('/api/categories/reset', { method: 'POST' })
    await refresh()
  }, [refresh])

  const visibleStudentCinemaPicks = useMemo(
    () =>
      hiddenNavIds.includes('gencSinema')
        ? []
        : filterCatalogByNavVisibility(studentCinemaPicks, hiddenNavIds),
    [studentCinemaPicks, hiddenNavIds],
  )

  const visibleStudentCinemaMonthlyWinners = useMemo(
    () =>
      hiddenNavIds.includes('gencSinema')
        ? []
        : filterCatalogByNavVisibility(studentCinemaMonthlyWinners, hiddenNavIds),
    [studentCinemaMonthlyWinners, hiddenNavIds],
  )

  const value = useMemo(
    () => ({
      catalog,
      visibleCatalog,
      categories,
      visibleCategories,
      categoryOrder,
      hiddenNavIds,
      featuredContent,
      trailers,
      newReleases,
      studentCinemaPicks: visibleStudentCinemaPicks,
      studentCinemaCatalog,
      studentCinemaMonthlyWinners: visibleStudentCinemaMonthlyWinners,
      cekimNotlariSections,
      isLoading,
      refresh,
      getContentById,
      isContentVisible,
      addContent,
      updateContent,
      deleteContent,
      setFeatured,
      addCategory,
      updateCategory,
      updateSiteNavVisibility,
      deleteCategory,
      reorderCategories,
      resetToSeed,
    }),
    [
      catalog,
      visibleCatalog,
      categories,
      visibleCategories,
      categoryOrder,
      hiddenNavIds,
      featuredContent,
      trailers,
      newReleases,
      visibleStudentCinemaPicks,
      studentCinemaCatalog,
      visibleStudentCinemaMonthlyWinners,
      cekimNotlariSections,
      isLoading,
      refresh,
      getContentById,
      isContentVisible,
      addContent,
      updateContent,
      deleteContent,
      setFeatured,
      addCategory,
      updateCategory,
      updateSiteNavVisibility,
      deleteCategory,
      reorderCategories,
      resetToSeed,
    ],
  )

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
}

export function useContent() {
  const context = useContext(ContentContext)
  if (!context) {
    throw new Error('useContent must be used within ContentProvider')
  }
  return context
}
