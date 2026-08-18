import { useEffect, useState } from 'react'
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
import {
  DEMO_LANDING_SHOWCASES,
  getDemoCatalog,
  resolveLandingShowcases,
} from '../data/demoLandingPosters'
import { fetchBootstrap, fetchLandingConfig } from '../api/client'
import type { ContentItem } from '../types/content'

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop&q=80'

function mergeCatalog(catalog: ContentItem[]) {
  const demo = getDemoCatalog()
  const ids = new Set(catalog.map((item) => item.id))
  return [...catalog, ...demo.filter((item) => !ids.has(item.id))]
}

export function LandingPage() {
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null)
  const [sliderItems, setSliderItems] = useState<ContentItem[]>([])
  const [showcases, setShowcases] = useState(DEMO_LANDING_SHOWCASES)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    void (async () => {
      let bootstrap = null
      try {
        bootstrap = await fetchBootstrap()
      } catch {
        return
      }

      const catalog =
        bootstrap.catalog.length >= 20 ? bootstrap.catalog : mergeCatalog(bootstrap.catalog)
      setHeroItem(bootstrap.featuredContent ?? catalog[0] ?? null)

      let landing = bootstrap.landing ?? null
      if (!landing) {
        try {
          landing = await fetchLandingConfig()
        } catch {
          landing = null
        }
      }

      const apiSlider = landing?.slider.length ? landing.slider : bootstrap.trailers
      setSliderItems(
        apiSlider.length >= 3 ? apiSlider.slice(0, 8) : DEMO_LANDING_SHOWCASES[1].items.slice(0, 8),
      )

      setShowcases(resolveLandingShowcases(landing?.showcases))
    })()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-dvh bg-sineoda-bg text-white">
      <LandingHeader scrolled={scrolled} />
      <LandingHero heroItem={heroItem} fallbackImage={FALLBACK_HERO} />
      <LandingManifesto />
      <LandingSlider items={sliderItems} />
      <LandingCategoryShowcase showcases={showcases} />
      <LandingJournalTeaser />
      <LandingFeatures />
      <LandingPricing />
      <LandingFaq />
      <LandingEmailSignup />
      <SiteFooter />
    </div>
  )
}
