import { useEffect, useMemo, useState } from 'react'
import {
  resolveMediaUrl,
  fetchBootstrap,
  fetchLandingConfig,
  updateLandingConfig,
  updateLandingHeroConfig,
  type LandingHeroConfig,
} from '../../api/client'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { BRAND_HERO } from '../../constants/brand'
import { getContentDisplayLabel, getContentTypeLabel } from '../../constants/contentTypes'
import type { ContentItem, ContentType } from '../../types/content'
import { fuzzySearchMatch } from '../../utils/search'

interface ShowcaseDraft {
  id: string
  title: string
  icon: string
  description: string
  itemIds: string[]
}

const DEFAULT_HERO: LandingHeroConfig = {
  line1: BRAND_HERO.line1,
  line2: BRAND_HERO.line2,
  description: BRAND_HERO.description,
  ctaPrimary: BRAND_HERO.ctaPrimary,
  ctaSecondary: BRAND_HERO.ctaSecondary,
  legalNote: BRAND_HERO.legalNote,
  backgroundImage: '',
  backgroundVideo: '',
  backgroundContentId: null,
  featuredContentId: null,
  showFeaturedCard: true,
}

function heroBackgroundMode(hero: LandingHeroConfig): 'image' | 'video' | 'content' | 'none' {
  if (hero.backgroundImage) return 'image'
  if (hero.backgroundVideo) return 'video'
  if (hero.backgroundContentId) return 'content'
  return 'none'
}

const ICON_OPTIONS = [
  { value: 'dizi', label: 'Dizi' },
  { value: 'film', label: 'Film' },
  { value: 'belgesel', label: 'Belgesel' },
  { value: 'cocuk', label: 'Çocuk' },
  { value: 'dikey', label: 'Dikey Diziler' },
]

type SliderTypeFilter = 'all' | ContentType | 'vertical'

const SLIDER_TYPE_FILTERS: Array<{ id: SliderTypeFilter; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'film', label: 'Filmler' },
  { id: 'dizi', label: 'Diziler' },
  { id: 'belgesel', label: 'Belgeseller' },
  { id: 'kisa-film', label: 'Kısa Filmler' },
  { id: 'vertical', label: 'Dikey Diziler' },
]

function matchesSliderTypeFilter(item: ContentItem, filter: SliderTypeFilter) {
  if (filter === 'all') return true
  if (filter === 'vertical') return item.videoFormat === 'vertical'
  if (item.videoFormat === 'vertical') return false
  return item.type === filter
}

function filterPickerCatalog(
  catalog: ContentItem[],
  query: string,
  typeFilter?: SliderTypeFilter,
) {
  return catalog.filter((item) => {
    if (typeFilter && !matchesSliderTypeFilter(item, typeFilter)) return false
    if (!query.trim()) return true
    return fuzzySearchMatch(
      query,
      item.title,
      item.id,
      item.genres.join(' '),
      getContentTypeLabel(item.type),
    )
  })
}

export function AdminLandingPage() {
  const [pickerCatalog, setPickerCatalog] = useState<ContentItem[]>([])
  const [hero, setHero] = useState<LandingHeroConfig>(DEFAULT_HERO)
  const [sliderIds, setSliderIds] = useState<string[]>([])
  const [showcases, setShowcases] = useState<ShowcaseDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([fetchBootstrap(), fetchLandingConfig()])
      .then(([bootstrap, data]) => {
        setPickerCatalog(bootstrap.catalog)
        setHero(data.hero ?? DEFAULT_HERO)
        setSliderIds(
          data.sliderContentIds?.length
            ? data.sliderContentIds
            : data.slider.map((item) => item.id),
        )
        setShowcases(
          data.showcases.map((showcase) => ({
            id: showcase.id,
            title: showcase.title,
            icon: showcase.icon,
            description: showcase.description,
            itemIds: showcase.items.map((item) => item.id),
          })),
        )
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleSliderItem = (contentId: string) => {
    setSliderIds((current) =>
      current.includes(contentId)
        ? current.filter((id) => id !== contentId)
        : [...current, contentId],
    )
  }

  const moveSliderItem = (index: number, direction: -1 | 1) => {
    setSliderIds((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const updateShowcase = (index: number, patch: Partial<ShowcaseDraft>) => {
    setShowcases((current) =>
      current.map((showcase, i) => (i === index ? { ...showcase, ...patch } : showcase)),
    )
  }

  const toggleShowcaseItem = (showcaseIndex: number, contentId: string) => {
    setShowcases((current) =>
      current.map((showcase, index) => {
        if (index !== showcaseIndex) return showcase
        const itemIds = showcase.itemIds.includes(contentId)
          ? showcase.itemIds.filter((id) => id !== contentId)
          : [...showcase.itemIds, contentId]
        return { ...showcase, itemIds }
      }),
    )
  }

  const addShowcase = () => {
    const id = `showcase-${Date.now()}`
    setShowcases((current) => [
      ...current,
      { id, title: 'Yeni Kategori', icon: 'film', description: '', itemIds: [] },
    ])
  }

  const removeShowcase = (index: number) => {
    setShowcases((current) => current.filter((_, i) => i !== index))
  }

  const moveShowcase = (index: number, direction: -1 | 1) => {
    setShowcases((current) => {
      const next = [...current]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const moveShowcaseItem = (showcaseIndex: number, itemIndex: number, direction: -1 | 1) => {
    setShowcases((current) =>
      current.map((showcase, index) => {
        if (index !== showcaseIndex) return showcase
        const itemIds = [...showcase.itemIds]
        const target = itemIndex + direction
        if (target < 0 || target >= itemIds.length) return showcase
        ;[itemIds[itemIndex], itemIds[target]] = [itemIds[target], itemIds[itemIndex]]
        return { ...showcase, itemIds }
      }),
    )
  }

  const removeShowcaseItem = (showcaseIndex: number, contentId: string) => {
    setShowcases((current) =>
      current.map((showcase, index) => {
        if (index !== showcaseIndex) return showcase
        return { ...showcase, itemIds: showcase.itemIds.filter((id) => id !== contentId) }
      }),
    )
  }

  const setHeroImage = (url: string) => {
    setHero((current) => ({
      ...current,
      backgroundImage: url,
      backgroundVideo: '',
      backgroundContentId: null,
    }))
  }

  const setHeroVideo = (url: string) => {
    setHero((current) => ({
      ...current,
      backgroundVideo: url,
      backgroundImage: '',
      backgroundContentId: null,
    }))
  }

  const setHeroContent = (contentId: string | null) => {
    setHero((current) => ({
      ...current,
      backgroundContentId: contentId,
      backgroundImage: '',
      backgroundVideo: '',
    }))
  }

  const updateHero = (patch: Partial<LandingHeroConfig>) => {
    setHero((current) => ({ ...current, ...patch }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const validIds = new Set(pickerCatalog.map((item) => item.id))
      const persistedSliderIds = sliderIds.filter((id) => validIds.has(id))
      const skipped = sliderIds.length - persistedSliderIds.length

      const heroResult = await updateLandingHeroConfig(hero)
      setHero(heroResult.hero)

      const data = await updateLandingConfig({ sliderIds: persistedSliderIds, showcases })
      setSliderIds(
        data.sliderContentIds?.length
          ? data.sliderContentIds
          : data.slider.map((item) => item.id),
      )
      setMessage(
        skipped > 0
          ? `Kaydedildi. ${skipped} demo içerik slider'a eklenemedi — yalnızca veritabanındaki içerikler kullanılır.`
          : 'Ana sayfa ayarları kaydedildi.',
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-sineoda-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ana Sayfa</h1>
          <p className="mt-1 text-sm text-sineoda-muted">
            Üye olmadan önceki ana sayfa: hero, slider ve kategori şeritleri
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/tanitim"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5"
          >
            Misafir ana sayfayı önizle
          </a>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
        <h2 className="text-lg font-semibold text-white">Hero (üst bölüm)</h2>
        <p className="mt-1 text-sm text-sineoda-muted">
          Giriş yapmadan görünen ana sayfanın başlık metinleri, arka plan görseli/videosu ve öne
          çıkan içerik kutusu. Giriş yapmışken <code className="text-white/70">/</code> farklı bir
          sayfadır — önizleme için yukarıdaki butonu kullanın.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Ana başlık</span>
            <input
              value={hero.line1}
              onChange={(event) => updateHero({ line1: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Alt başlık</span>
            <input
              value={hero.line2}
              onChange={(event) => updateHero({ line2: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm text-white/85">Açıklama</span>
          <textarea
            value={hero.description}
            onChange={(event) => updateHero({ description: event.target.value })}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Birincil buton</span>
            <input
              value={hero.ctaPrimary}
              onChange={(event) => updateHero({ ctaPrimary: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-white/85">İkincil buton</span>
            <input
              value={hero.ctaSecondary}
              onChange={(event) => updateHero({ ctaSecondary: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm text-white/85">Yasal not (küçük metin)</span>
          <input
            value={hero.legalNote}
            onChange={(event) => updateHero({ legalNote: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
          />
        </label>

        <div className="mt-6 border-t border-white/10 pt-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-white">Arka plan görseli</p>
            <p className="mt-1 text-xs text-sineoda-muted">
              Özel görsel yükleyin. Kaydedince katalog görselinin yerine geçer.
            </p>
            <div className="mt-3">
              <ImageUpload label="Görsel" value={hero.backgroundImage} onChange={setHeroImage} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Arka plan videosu</p>
            <p className="mt-1 text-xs text-sineoda-muted">.mp4 dosyası veya doğrudan video URL.</p>
            <div className="mt-3 space-y-2">
              <VideoUpload label="Video" value={hero.backgroundVideo} onChange={setHeroVideo} />
              {/youtube\.com|youtu\.be/i.test(hero.backgroundVideo) && (
                <p className="text-xs text-amber-300">
                  YouTube linki çalışmaz. Video dosyası yükleyin.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Katalog içeriğinden arka plan</p>
            <p className="mt-1 text-xs text-sineoda-muted">
              Özel görsel/video yoksa seçilen içeriğin backdrop/poster görseli kullanılır.
            </p>
            <div className="mt-3">
              <SingleContentPicker
                catalog={pickerCatalog}
                selectedId={hero.backgroundContentId}
                onSelect={setHeroContent}
                label=""
                emptyLabel="Seçilmedi — varsayılan görsel kullanılır"
              />
            </div>
          </div>

          {heroBackgroundMode(hero) !== 'none' && (
            <p className="text-xs text-sineoda-gold">
              Aktif arka plan:{' '}
              {heroBackgroundMode(hero) === 'image'
                ? 'Özel görsel'
                : heroBackgroundMode(hero) === 'video'
                  ? 'Video'
                  : 'Katalog içeriği'}
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <label className="flex items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={hero.showFeaturedCard}
              onChange={(event) => updateHero({ showFeaturedCard: event.target.checked })}
              className="accent-sineoda-gold"
            />
            &quot;Bu hafta öne çıkan&quot; kutusunu göster
          </label>

          {hero.showFeaturedCard && (
            <div className="mt-4">
              <SingleContentPicker
                catalog={pickerCatalog}
                selectedId={hero.featuredContentId}
                onSelect={(contentId) => updateHero({ featuredContentId: contentId })}
                label="Öne çıkan içerik"
                emptyLabel="Seçilmedi — katalogdaki öne çıkan içerik kullanılır"
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
        <h2 className="text-lg font-semibold text-white">Slider</h2>
        <p className="mt-1 text-sm text-sineoda-muted">
          Filmler, diziler ve belgeseller sekmelerinden seçim yap. Seçtiklerin birleşerek landing
          ana sayfasındaki fragman slider&apos;ına yansır.
        </p>

        {sliderIds.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
              Slider sırası ({sliderIds.length} içerik)
            </p>
            <div className="flex flex-wrap gap-2">
              {sliderIds.map((contentId, index) => {
                const item = pickerCatalog.find((entry) => entry.id === contentId)
                if (!item) return null
                return (
                  <div
                    key={contentId}
                    className="flex items-center gap-2 rounded-lg border border-sineoda-gold/30 bg-sineoda-gold/10 px-2 py-1"
                  >
                    <img
                      src={resolveMediaUrl(item.poster)}
                      alt=""
                      className="h-10 w-7 rounded object-cover"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-medium text-white">{item.title}</span>
                      <span className="text-[10px] text-sineoda-muted">
                        {getContentDisplayLabel(item)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => moveSliderItem(index, -1)}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSliderItem(index, 1)}
                      className="text-xs text-white/60 hover:text-white"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSliderItem(contentId)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <ContentPicker
          catalog={pickerCatalog}
          selectedIds={sliderIds}
          onToggle={toggleSliderItem}
          typeFilters={SLIDER_TYPE_FILTERS}
          searchPlaceholder="Başlık, tür veya ID ile ara..."
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Kategori Şeritleri</h2>
            <p className="mt-1 text-sm text-sineoda-muted">
              Dizi, Film, Belgesel, Çocuk, Dikey Dizi gibi sekmeler ve altındaki poster satırları
            </p>
          </div>
          <button
            type="button"
            onClick={addShowcase}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            + Kategori Ekle
          </button>
        </div>

        {showcases.map((showcase, index) => (
          <section
            key={showcase.id}
            className="rounded-2xl border border-white/10 bg-[#11141c] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <input
                  value={showcase.title}
                  onChange={(event) => updateShowcase(index, { title: event.target.value })}
                  placeholder="Başlık (ör. Dizi)"
                  className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
                />
                <select
                  value={showcase.icon}
                  onChange={(event) => updateShowcase(index, { icon: event.target.value })}
                  className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
                >
                  {ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveShowcase(index, -1)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveShowcase(index, 1)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeShowcase(index)}
                  className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20"
                >
                  Sil
                </button>
              </div>
            </div>

            <textarea
              value={showcase.description}
              onChange={(event) => updateShowcase(index, { description: event.target.value })}
              placeholder="Kategori açıklaması"
              rows={2}
              className="mt-3 w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
            />

            <div className="mt-4">
              {showcase.itemIds.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
                    Sıralama (gösterim sırası)
                  </p>
                  {showcase.itemIds.map((contentId, itemIndex) => {
                    const item = pickerCatalog.find((entry) => entry.id === contentId)
                    if (!item) return null
                    return (
                      <div
                        key={contentId}
                        className="flex items-center gap-2 rounded-lg border border-sineoda-gold/20 bg-sineoda-gold/5 px-3 py-2"
                      >
                        <img
                          src={resolveMediaUrl(item.poster)}
                          alt=""
                          className="h-10 w-7 rounded object-cover"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-white">{item.title}</span>
                        <button
                          type="button"
                          onClick={() => moveShowcaseItem(index, itemIndex, -1)}
                          className="text-xs text-white/60 hover:text-white"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveShowcaseItem(index, itemIndex, 1)}
                          className="text-xs text-white/60 hover:text-white"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeShowcaseItem(index, contentId)}
                          className="text-xs text-red-300 hover:text-red-200"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <ContentPicker
                catalog={pickerCatalog}
                selectedIds={showcase.itemIds}
                onToggle={(contentId) => toggleShowcaseItem(index, contentId)}
                searchPlaceholder="Bu kategori için içerik ara..."
              />
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}

function SingleContentPicker({
  catalog,
  selectedId,
  onSelect,
  label,
  emptyLabel,
}: {
  catalog: ContentItem[]
  selectedId: string | null
  onSelect: (contentId: string | null) => void
  label: string
  emptyLabel: string
}) {
  const [query, setQuery] = useState('')
  const selectedItem = selectedId ? catalog.find((item) => item.id === selectedId) : null

  const filteredCatalog = useMemo(
    () => filterPickerCatalog(catalog, query),
    [catalog, query],
  )

  const visibleItems = filteredCatalog.slice(0, 24)

  return (
    <div className="space-y-3">
      <span className="block text-sm text-white/85">{label}</span>

      {selectedItem ? (
        <div className="flex items-center gap-3 rounded-lg border border-sineoda-gold/30 bg-sineoda-gold/10 px-3 py-2">
          <img
            src={resolveMediaUrl(selectedItem.poster)}
            alt=""
            className="h-12 w-8 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{selectedItem.title}</p>
            <p className="text-xs text-sineoda-muted">{getContentDisplayLabel(selectedItem)}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-red-300 hover:text-red-200"
          >
            Temizle
          </button>
        </div>
      ) : (
        <p className="text-xs text-sineoda-muted">{emptyLabel}</p>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="İçerik ara..."
        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-sm text-white outline-none focus:border-sineoda-gold"
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
              selectedId === item.id
                ? 'border-sineoda-gold/40 bg-sineoda-gold/10'
                : 'border-white/10 hover:bg-white/5'
            }`}
          >
            <img
              src={resolveMediaUrl(item.poster)}
              alt=""
              className="h-12 w-8 rounded object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs text-sineoda-muted">{getContentDisplayLabel(item)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ContentPicker({
  catalog,
  selectedIds,
  onToggle,
  typeFilters,
  searchPlaceholder = 'İçerik ara...',
  maxResults = 48,
}: {
  catalog: ContentItem[]
  selectedIds: string[]
  onToggle: (contentId: string) => void
  typeFilters?: Array<{ id: SliderTypeFilter; label: string }>
  searchPlaceholder?: string
  maxResults?: number
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<SliderTypeFilter>('all')

  const filteredCatalog = useMemo(
    () => filterPickerCatalog(catalog, query, typeFilters ? typeFilter : undefined),
    [catalog, query, typeFilter, typeFilters],
  )

  const visibleItems = filteredCatalog.slice(0, maxResults)

  return (
    <div className="mt-4 space-y-3">
      {typeFilters && typeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTypeFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === filter.id
                  ? 'bg-sineoda-gold text-sineoda-bg'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-sm text-white outline-none focus:border-sineoda-gold"
      />

      <p className="text-xs text-sineoda-muted">
        {filteredCatalog.length === 0
          ? 'Eşleşen içerik yok.'
          : filteredCatalog.length > maxResults
            ? `${maxResults} / ${filteredCatalog.length} sonuç gösteriliyor — aramayı daraltın.`
            : `${filteredCatalog.length} içerik listeleniyor.`}
        {selectedIds.length > 0 && ` Seçili: ${selectedIds.length}.`}
      </p>

      {visibleItems.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-sineoda-muted">
          {query.trim() ? 'Aramanızla eşleşen içerik bulunamadı.' : 'Bu filtrede içerik yok.'}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const checked = selectedIds.includes(item.id)
            return (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
                  checked
                    ? 'border-sineoda-gold/40 bg-sineoda-gold/10'
                    : 'border-white/10 hover:bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  className="accent-sineoda-gold"
                />
                <img
                  src={resolveMediaUrl(item.poster)}
                  alt=""
                  className="h-12 w-8 rounded object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-sineoda-muted">{getContentDisplayLabel(item)}</p>
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
