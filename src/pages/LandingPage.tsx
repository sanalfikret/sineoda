import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { LandingHeader } from '../components/landing/LandingHeader'
import { LandingPageBlocks } from '../components/landing/LandingPageBlocks'
import {
  DEMO_LANDING_SHOWCASES,
  getDemoCatalog,
  resolveLandingShowcases,
} from '../data/demoLandingPosters'
import { fetchBootstrap, fetchLandingConfig } from '../api/client'
import type { LandingHeroConfig } from '../api/client'
import { DEFAULT_LANDING_SECTIONS, mergeLandingSections } from '../constants/landingDefaults'
import { normalizeLandingLayout } from '../constants/landingLayout'
import { resolveLandingSliderItems } from '../utils/landingSlider'
import type { ContentItem } from '../types/content'

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop&q=80'

function mergeCatalog(catalog: ContentItem[]) {
  const demo = getDemoCatalog()
  const ids = new Set(catalog.map((item) => item.id))
  return [...catalog, ...demo.filter((item) => !ids.has(item.id))]
}

function findContent(catalog: ContentItem[], contentId: string | null | undefined) {
  if (!contentId) return null
  return catalog.find((item) => item.id === contentId) ?? null
}

export function LandingPage() {
  const [catalog, setCatalog] = useState<ContentItem[]>([])
  const [heroConfig, setHeroConfig] = useState<LandingHeroConfig | null>(null)
  const [sections, setSections] = useState(DEFAULT_LANDING_SECTIONS)
  const [layout, setLayout] = useState(() => normalizeLandingLayout(null))
  const [sliderItems, setSliderItems] = useState<ContentItem[]>([])
  const [showcases, setShowcases] = useState(DEMO_LANDING_SHOWCASES)
  const [studentPicks, setStudentPicks] = useState<ContentItem[]>([])
  const [scrolled, setScrolled] = useState(false)
  const [ready, setReady] = useState(false)

  const loadLanding = useCallback(async () => {
    const [bootstrap, landing] = await Promise.all([
      fetchBootstrap(),
      fetchLandingConfig(),
    ])

    const mergedCatalog =
      bootstrap.catalog.length >= 20 ? bootstrap.catalog : mergeCatalog(bootstrap.catalog)

    setCatalog(mergedCatalog)
    setHeroConfig(landing.hero ?? bootstrap.landing?.hero ?? null)
    setSections(mergeLandingSections(landing.sections ?? bootstrap.landing?.sections))
    setLayout(normalizeLandingLayout(landing.layout ?? bootstrap.landing?.layout))
    const apiSlider = resolveLandingSliderItems(landing, mergedCatalog, bootstrap.trailers ?? [])
    setSliderItems(
      apiSlider.length > 0 ? apiSlider : DEMO_LANDING_SHOWCASES[1].items.slice(0, 8),
    )
    setShowcases(resolveLandingShowcases(landing.showcases))
    setStudentPicks(bootstrap.studentCinemaPicks ?? [])
    setReady(true)
  }, [])

  useEffect(() => {
    void loadLanding().catch(() => setReady(true))
  }, [loadLanding])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const lookupCatalog = useMemo(() => {
    const seen = new Set<string>()
    return [...catalog, ...studentPicks, ...sliderItems].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [catalog, studentPicks, sliderItems])

  const backgroundContent = useMemo(
    () => findContent(lookupCatalog, heroConfig?.backgroundContentId),
    [lookupCatalog, heroConfig?.backgroundContentId],
  )

  const featuredItem = useMemo(() => {
    const fromHero = findContent(lookupCatalog, heroConfig?.featuredContentId)
    if (fromHero) return fromHero
    return (
      lookupCatalog.find((item) => item.featured && item.program !== 'student_cinema') ??
      lookupCatalog[0] ??
      null
    )
  }, [lookupCatalog, heroConfig?.featuredContentId])

  if (!ready || !heroConfig) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-sineoda-bg text-white">
      <LandingHeader scrolled={scrolled} />
      <LandingPageBlocks
        ctx={{
          heroConfig,
          backgroundContent,
          featuredItem,
          fallbackImage: FALLBACK_HERO,
          sections,
          sliderItems,
          studentPicks,
          showcases,
          layout,
        }}
      />
      <SiteFooter />
    </div>
  )
}
