import { useCallback, useEffect, useMemo, useState } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { LandingFeatures } from '../components/landing/LandingFeatures'
import { LandingManifesto } from '../components/landing/LandingManifesto'
import { LandingHeader } from '../components/landing/LandingHeader'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingCategoryShowcase } from '../components/landing/LandingCategoryShowcase'
import { LandingSlider } from '../components/landing/LandingSlider'
import { LandingEmailSignup } from '../components/landing/LandingEmailSignup'
import { LandingFaq } from '../components/landing/LandingFaq'
import { LandingJournalTeaser } from '../components/landing/LandingJournalTeaser'
import { LandingPricing } from '../components/landing/LandingPricing'
import { LandingCreatorSection } from '../components/landing/LandingCreatorSection'
import { LandingStudentCinemaSection } from '../components/landing/LandingStudentCinemaSection'
import { StudentCinemaPicksRow } from '../components/StudentCinemaPicksRow'
import {
  DEMO_LANDING_SHOWCASES,
  getDemoCatalog,
  resolveLandingShowcases,
} from '../data/demoLandingPosters'
import { fetchBootstrap, fetchLandingConfig } from '../api/client'
import type { LandingHeroConfig } from '../api/client'
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
      <LandingHero
        hero={heroConfig}
        backgroundContent={backgroundContent}
        featuredItem={featuredItem}
        fallbackImage={FALLBACK_HERO}
      />
      <LandingManifesto />
      <LandingSlider items={sliderItems} />
      <StudentCinemaPicksRow items={studentPicks} guestMode className="pt-4" />
      <LandingCategoryShowcase showcases={showcases} />
      <LandingJournalTeaser />
      <LandingFeatures />
      <LandingPricing />
      <LandingStudentCinemaSection />
      <LandingFaq />
      <LandingEmailSignup />
      <LandingCreatorSection />
      <SiteFooter />
    </div>
  )
}
