import type { ContentItem } from '../types/content'
import type { LandingShowcase } from '../components/landing/LandingCategoryShowcase'

export function buildFallbackShowcases(catalog: ContentItem[]): LandingShowcase[] {
  const byType = (type: string) => catalog.filter((item) => item.type === type).slice(0, 20)
  const vertical = catalog.filter((item) => item.videoFormat === 'vertical').slice(0, 20)
  const family = catalog
    .filter((item) => item.genres.includes('Aile') || item.rating === 'Genel')
    .slice(0, 20)
  const kisa = catalog.filter((item) => item.type === 'kisa-film').slice(0, 20)

  return [
    {
      id: 'fallback-dizi',
      title: 'Dizi',
      icon: 'dizi',
      description: 'Sezon sezon sürükleyici hikayeler ve orijinal diziler.',
      items: byType('dizi'),
    },
    {
      id: 'fallback-film',
      title: 'Film',
      icon: 'film',
      description: 'Ödüllü yapımlar, festival favorileri ve seçkin sinema.',
      items: byType('film'),
    },
    {
      id: 'fallback-belgesel',
      title: 'Belgesel',
      icon: 'belgesel',
      description: 'Gerçek hikayeler, derin keşifler ve doğa belgeselleri.',
      items: byType('belgesel'),
    },
    {
      id: 'fallback-cocuk',
      title: 'Çocuk',
      icon: 'cocuk',
      description: 'Ailece izlenebilecek güvenli ve eğlenceli içerikler.',
      items: family,
    },
    {
      id: 'fallback-dikey',
      title: 'Dikey Dizi',
      icon: 'dikey',
      description: 'Mobil öncelikli kısa bölümler — kaydır, izle, devam et.',
      items: vertical,
    },
    {
      id: 'fallback-kisa-film',
      title: 'Kısa Film',
      icon: 'film',
      description: 'Festival ödüllü kısa metraj yapımlar.',
      items: kisa,
    },
  ].filter((showcase) => showcase.items.length > 0)
}
