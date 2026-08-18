import { useEffect, useMemo, useState } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { LandingFeatures } from '../components/landing/LandingFeatures'
import { LandingHeader } from '../components/landing/LandingHeader'
import { LandingHero } from '../components/landing/LandingHero'
import { LandingHubs } from '../components/landing/LandingHubs'
import { LandingFaq } from '../components/landing/LandingFaq'
import { LandingPricing } from '../components/landing/LandingPricing'
import { fetchBootstrap, resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop&q=80'

export function LandingPage() {
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null)
  const [teaserPosters, setTeaserPosters] = useState<string[]>([])
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetchBootstrap()
      .then((data) => {
        setHeroItem(data.featuredContent ?? data.catalog[0] ?? null)
        const posters = data.catalog
          .slice(0, 6)
          .map((item) => resolveMediaUrl(item.poster))
          .filter(Boolean)
        setTeaserPosters(posters)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const uniquePosters = useMemo(
    () => [...new Set(teaserPosters)].filter((url) => url !== resolveMediaUrl(heroItem?.poster ?? '')),
    [teaserPosters, heroItem],
  )

  return (
    <div className="min-h-dvh bg-sineoda-bg text-white">
      <LandingHeader scrolled={scrolled} />
      <LandingHero
        heroItem={heroItem}
        teaserPosters={uniquePosters}
        fallbackImage={FALLBACK_HERO}
      />
      <LandingHubs />
      <LandingFeatures />
      <LandingPricing />
      <LandingFaq />
      <SiteFooter />
    </div>
  )
}
