import { useEffect, useState } from 'react'
import { resolveMediaUrl, fetchLandingConfig, updateLandingConfig } from '../../api/client'
import { useContent } from '../../context/ContentContext'
import type { ContentItem } from '../../types/content'

interface ShowcaseDraft {
  id: string
  title: string
  icon: string
  description: string
  itemIds: string[]
}

const ICON_OPTIONS = [
  { value: 'dizi', label: 'Dizi' },
  { value: 'film', label: 'Film' },
  { value: 'belgesel', label: 'Belgesel' },
  { value: 'cocuk', label: 'Çocuk' },
  { value: 'dikey', label: 'Dikey Diziler' },
]

export function AdminLandingPage() {
  const { catalog } = useContent()
  const [sliderIds, setSliderIds] = useState<string[]>([])
  const [showcases, setShowcases] = useState<ShowcaseDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchLandingConfig()
      .then((data) => {
        setSliderIds(data.slider.map((item) => item.id))
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

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await updateLandingConfig({ sliderIds, showcases })
      setMessage('Ana sayfa ayarları kaydedildi.')
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
            Üye olmadan önceki ana sayfa: slider ve Tabii tarzı kategori şeritleri
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5">
        <h2 className="text-lg font-semibold text-white">Slider</h2>
        <p className="mt-1 text-sm text-sineoda-muted">
          Ana sayfadaki fragman slider&apos;ında gösterilecek içerikleri seç ve sırala.
        </p>

        {sliderIds.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sliderIds.map((contentId, index) => {
              const item = catalog.find((entry) => entry.id === contentId)
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
                  <span className="text-xs font-medium text-white">{item.title}</span>
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
        )}

        <ContentPicker
          catalog={catalog}
          selectedIds={sliderIds}
          onToggle={toggleSliderItem}
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
                    const item = catalog.find((entry) => entry.id === contentId)
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
                catalog={catalog}
                selectedIds={showcase.itemIds}
                onToggle={(contentId) => toggleShowcaseItem(index, contentId)}
              />
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}

function ContentPicker({
  catalog,
  selectedIds,
  onToggle,
}: {
  catalog: ContentItem[]
  selectedIds: string[]
  onToggle: (contentId: string) => void
}) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {catalog.map((item) => {
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
              <p className="text-xs text-sineoda-muted">{item.type}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
