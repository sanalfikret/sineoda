import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, fetchBootstrap } from '../api/client'
import { mergeWithDemoCatalog } from '../data/demoLandingPosters'
import { resolveLandingSliderItems } from '../utils/landingSlider'
import type { ContentCategory, ContentItem } from '../types/content'

interface ContentContextValue {
  catalog: ContentItem[]
  categories: ContentCategory[]
  featuredContent: ContentItem | null
  trailers: ContentItem[]
  newReleases: ContentItem[]
  studentCinemaPicks: ContentItem[]
  landingSlider: ContentItem[]
  isLoading: boolean
  refresh: () => Promise<void>
  getContentById: (id: string) => ContentItem | undefined
  addContent: (item: Omit<ContentItem, 'id'> & { id?: string }) => Promise<ContentItem>
  updateContent: (id: string, updates: Partial<ContentItem>) => Promise<void>
  deleteContent: (id: string) => Promise<void>
  setFeatured: (id: string) => Promise<void>
  addCategory: (title: string) => Promise<ContentCategory>
  updateCategory: (
    id: string,
    updates: Partial<Pick<ContentCategory, 'title' | 'itemIds'>>,
  ) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reorderCategories: (orderedIds: string[]) => Promise<ContentCategory[]>
  resetToSeed: () => Promise<void>
}

const ContentContext = createContext<ContentContextValue | null>(null)

export function ContentProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<ContentItem[]>([])
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [featuredContent, setFeaturedContent] = useState<ContentItem | null>(null)
  const [trailers, setTrailers] = useState<ContentItem[]>([])
  const [newReleases, setNewReleases] = useState<ContentItem[]>([])
  const [studentCinemaPicks, setStudentCinemaPicks] = useState<ContentItem[]>([])
  const [landingSlider, setLandingSlider] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await fetchBootstrap()
    const mergedCatalog = mergeWithDemoCatalog(data.catalog)
    setCatalog(mergedCatalog)
    setCategories(data.categories)
    setFeaturedContent(data.featuredContent)
    setTrailers(data.trailers ?? [])
    setNewReleases(data.newReleases ?? [])
    setStudentCinemaPicks(data.studentCinemaPicks ?? [])
    setLandingSlider(
      resolveLandingSliderItems(data.landing, mergedCatalog, data.trailers ?? []),
    )
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

  const getContentById = useCallback(
    (id: string) => catalog.find((item) => item.id === id) ?? studentCinemaPicks.find((item) => item.id === id),
    [catalog, studentCinemaPicks],
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
      const result = await api<{ category: ContentCategory }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ title }),
      })
      await refresh()
      return result.category
    },
    [refresh],
  )

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Pick<ContentCategory, 'title' | 'itemIds'>>) => {
      await api(`/api/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
      await refresh()
    },
    [refresh],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      await api(`/api/categories/${id}`, { method: 'DELETE' })
      await refresh()
    },
    [refresh],
  )

  const reorderCategories = useCallback(async (orderedIds: string[]) => {
    const result = await api<{ categories: ContentCategory[] }>('/api/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds }),
    })
    setCategories(result.categories)
    await refresh()
    return result.categories
  }, [refresh])

  const resetToSeed = useCallback(async () => {
    await api('/api/categories/reset', { method: 'POST' })
    await refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      catalog,
      categories,
      featuredContent,
      trailers,
      newReleases,
      studentCinemaPicks,
      landingSlider,
      isLoading,
      refresh,
      getContentById,
      addContent,
      updateContent,
      deleteContent,
      setFeatured,
      addCategory,
      updateCategory,
      deleteCategory,
      reorderCategories,
      resetToSeed,
    }),
    [
      catalog,
      categories,
      featuredContent,
      trailers,
      newReleases,
      studentCinemaPicks,
      landingSlider,
      isLoading,
      refresh,
      getContentById,
      addContent,
      updateContent,
      deleteContent,
      setFeatured,
      addCategory,
      updateCategory,
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
