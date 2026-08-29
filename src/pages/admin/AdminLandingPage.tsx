import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  resolveMediaUrl,
  fetchAdminCatalog,
  fetchLandingConfig,
  saveLandingPageConfig,
  updateLandingLayoutConfig,
  type LandingHeroConfig,
} from '../../api/client'
import { AdminLandingCustomBlockEditor } from '../../components/admin/AdminLandingCustomBlockEditor'
import {
  AdminLandingSectionBlock,
  isLandingContentBlock,
} from '../../components/admin/AdminLandingSectionsEditor'
import { CollapsibleAdminPanel } from '../../components/admin/CollapsibleAdminPanel'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { BRAND_HERO } from '../../constants/brand'
import { DEFAULT_LANDING_SECTIONS, mergeLandingSections } from '../../constants/landingDefaults'
import {
  DEFAULT_LANDING_BLOCK_ORDER,
  LANDING_BLOCK_HINTS,
  getLayoutBlockLabel,
  isCustomLandingBlockId,
  normalizeLandingLayout,
  type BuiltInLandingBlockId,
  type LandingLayoutBlockId,
  type LandingLayoutConfig,
} from '../../constants/landingLayout'
import {
  createEmptyCustomBlock,
  customBlockLayoutId,
  CUSTOM_BLOCK_TYPE_LABELS,
  type LandingCustomBlock,
  type LandingCustomBlockType,
} from '../../constants/landingCustomBlocks'
import { getContentDisplayLabel, getContentTypeLabel } from '../../constants/contentTypes'
import type { ContentItem } from '../../types/content'
import {
  filterCatalogByPool,
  LANDING_CONTENT_POOL_FILTERS,
  matchesContentPool,
  poolForShowcaseIcon,
  type ContentPoolId,
} from '../../utils/contentPools'
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
  ctaPrimaryLink: '/kayit',
  ctaSecondary: BRAND_HERO.ctaSecondary,
  ctaSecondaryLink: '/giris',
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
  { value: 'film', label: 'Uzun metraj' },
  { value: 'kisa-film', label: 'Kısa film' },
  { value: 'belgesel', label: 'Belgesel' },
  { value: 'genc-sinema', label: 'Öğrenci filmleri' },
  { value: 'cekim-notlari', label: 'Ders notları' },
  { value: 'dikey', label: 'Dikey Diziler' },
  { value: 'cocuk', label: 'Çocuk / Aile' },
]

function filterPickerCatalog(
  catalog: ContentItem[],
  query: string,
  poolFilter?: ContentPoolId,
) {
  return catalog.filter((item) => {
    if (poolFilter && !matchesContentPool(item, poolFilter)) return false
    if (!query.trim()) return true
    return fuzzySearchMatch(
      query,
      item.title,
      item.id,
      item.genres.join(' '),
      getContentTypeLabel(item.type),
      item.program ?? 'standard',
    )
  })
}

export function AdminLandingPage() {
  const [pickerCatalog, setPickerCatalog] = useState<ContentItem[]>([])
  const [hero, setHero] = useState<LandingHeroConfig>(DEFAULT_HERO)
  const [sections, setSections] = useState(DEFAULT_LANDING_SECTIONS)
  const [customBlocks, setCustomBlocks] = useState<LandingCustomBlock[]>([])
  const [layout, setLayout] = useState<LandingLayoutConfig>(() =>
    normalizeLandingLayout({ order: DEFAULT_LANDING_BLOCK_ORDER, hidden: [] }),
  )
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(['hero']))
  const [draggingBlockId, setDraggingBlockId] = useState<LandingLayoutBlockId | null>(null)
  const [sliderIds, setSliderIds] = useState<string[]>([])
  const [monthlyWinnerIds, setMonthlyWinnerIds] = useState<string[]>([])
  const [studentPickIds, setStudentPickIds] = useState<string[]>([])
  const [showcases, setShowcases] = useState<ShowcaseDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([fetchAdminCatalog(), fetchLandingConfig()])
      .then(([adminCatalog, data]) => {
        setPickerCatalog(adminCatalog.catalog)
        setHero(data.hero ?? DEFAULT_HERO)
        setSections(mergeLandingSections(data.sections))
        const loadedCustomBlocks = data.customBlocks ?? []
        setCustomBlocks(loadedCustomBlocks)
        setLayout(
          normalizeLandingLayout(
            data.layout,
            loadedCustomBlocks.map((block) => block.id),
          ),
        )
        setSliderIds(
          data.sliderContentIds?.length
            ? data.sliderContentIds
            : data.slider.map((item) => item.id),
        )
        setMonthlyWinnerIds(
          data.monthlyWinnerContentIds?.length
            ? data.monthlyWinnerContentIds
            : (data.monthlyWinners ?? []).map((item) => item.id),
        )
        setStudentPickIds(
          data.studentPickContentIds?.length
            ? data.studentPickContentIds
            : (data.studentPicks ?? []).map((item) => item.id),
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

  const toggleExpanded = (id: string) => {
    setExpandedBlocks((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const studentCinemaCatalog = useMemo(
    () => pickerCatalog.filter((item) => item.program === 'student_cinema'),
    [pickerCatalog],
  )

  const persistLayout = async (nextLayout: LandingLayoutConfig) => {
    const normalized = normalizeLandingLayout(
      nextLayout,
      customBlocks.map((block) => block.id),
    )
    const { layout: saved } = await updateLandingLayoutConfig(normalized)
    setLayout(
      normalizeLandingLayout(
        saved,
        customBlocks.map((block) => block.id),
      ),
    )
  }

  const toggleBlockHidden = (id: LandingLayoutBlockId) => {
    setLayout((current) => {
      const normalized = normalizeLandingLayout(
        current,
        customBlocks.map((block) => block.id),
      )
      const hidden = normalized.hidden.includes(id)
        ? normalized.hidden.filter((entry) => entry !== id)
        : [...normalized.hidden, id]
      const nextLayout = { ...normalized, hidden }
      void persistLayout(nextLayout).catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Gizleme ayarı kaydedilemedi.')
      })
      return nextLayout
    })
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    setLayout((current) => {
      const normalized = normalizeLandingLayout(
        current,
        customBlocks.map((block) => block.id),
      )
      const nextOrder = [...normalized.order]
      const target = index + direction
      if (target < 0 || target >= nextOrder.length) return normalized
      ;[nextOrder[index], nextOrder[target]] = [nextOrder[target], nextOrder[index]]
      const nextLayout = { ...normalized, order: nextOrder }
      void persistLayout(nextLayout).catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Sıralama kaydedilemedi.')
      })
      return nextLayout
    })
  }

  const moveBlockById = (sourceId: LandingLayoutBlockId, targetId: LandingLayoutBlockId) => {
    if (sourceId === targetId) return
    setLayout((current) => {
      const normalized = normalizeLandingLayout(
        current,
        customBlocks.map((block) => block.id),
      )
      const nextOrder = [...normalized.order]
      const sourceIndex = nextOrder.indexOf(sourceId)
      const targetIndex = nextOrder.indexOf(targetId)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return normalized
      const [moved] = nextOrder.splice(sourceIndex, 1)
      nextOrder.splice(targetIndex, 0, moved)
      return { ...normalized, order: nextOrder }
    })
  }

  const handleBlockDragStart = (event: DragEvent<HTMLElement>, id: LandingLayoutBlockId) => {
    setDraggingBlockId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  const handleBlockDragOver = (event: DragEvent<HTMLElement>, targetId: LandingLayoutBlockId) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (!draggingBlockId || draggingBlockId === targetId) return
    moveBlockById(draggingBlockId, targetId)
  }

  const handleBlockDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
  }

  const handleBlockDragEnd = () => {
    if (draggingBlockId) {
      const normalized = normalizeLandingLayout(
        layoutRef.current,
        customBlocks.map((block) => block.id),
      )
      void persistLayout(normalized).catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Sıralama kaydedilemedi.')
      })
    }
    setDraggingBlockId(null)
  }

  const blockSubtitle = (id: LandingLayoutBlockId): string => {
    if (isCustomLandingBlockId(id)) {
      const block = customBlocks.find((entry) => customBlockLayoutId(entry.id) === id)
      return block
        ? block.type === 'contentRow'
          ? `${CUSTOM_BLOCK_TYPE_LABELS[block.type]} · ${(block.itemIds ?? []).length} içerik`
          : CUSTOM_BLOCK_TYPE_LABELS[block.type]
        : 'Özel bölüm'
    }
    const builtInId = id as BuiltInLandingBlockId
    if (builtInId === 'slider') return `${sliderIds.length} içerik seçili`
    if (builtInId === 'studentMonthlyWinners') return `${monthlyWinnerIds.length} birinci seçili`
    if (builtInId === 'studentPicks') return `${studentPickIds.length} film seçili`
    if (builtInId === 'showcases') return `${showcases.length} kategori şeridi`
    if (builtInId === 'faq') return `${sections.faq.items.length} soru`
    if (layout.hidden.includes(id)) return 'Misafir sayfasında gizli'
    return LANDING_BLOCK_HINTS[builtInId] ?? ''
  }

  const addCustomBlock = (type: LandingCustomBlockType = 'richText') => {
    try {
      const block = createEmptyCustomBlock(type)
      const layoutId = customBlockLayoutId(block.id) as LandingLayoutBlockId

      setCustomBlocks((current) => {
        const nextBlocks = [...current, block]
        setLayout((layoutCurrent) => {
          const normalized = normalizeLandingLayout(
            layoutCurrent,
            nextBlocks.map((entry) => entry.id),
          )
          const order = normalized.order.includes(layoutId)
            ? normalized.order
            : [...normalized.order, layoutId]
          return { ...normalized, order }
        })
        return nextBlocks
      })

      setExpandedBlocks((current) => new Set([...current, layoutId]))
      setMessage(
        type === 'contentRow'
          ? 'İçerik satırı eklendi. Film seçip Kaydet\'e basın.'
          : 'Özel bölüm eklendi. Yayına almak için Kaydet\'e basın.',
      )

      requestAnimationFrame(() => {
        document.getElementById(`landing-block-${layoutId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Özel bölüm eklenemedi.')
    }
  }

  const removeCustomBlock = (blockId: string) => {
    const layoutId = customBlockLayoutId(blockId)
    setCustomBlocks((current) => current.filter((block) => block.id !== blockId))
    setLayout((current) => {
      const nextCustomIds = customBlocks.filter((block) => block.id !== blockId).map((block) => block.id)
      const normalized = normalizeLandingLayout(current, nextCustomIds)
      return {
        order: normalized.order.filter((id) => id !== layoutId),
        hidden: normalized.hidden.filter((id) => id !== layoutId),
      }
    })
  }

  const updateCustomBlock = (blockId: string, nextBlock: LandingCustomBlock) => {
    setCustomBlocks((current) => current.map((block) => (block.id === blockId ? nextBlock : block)))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const validIds = new Set(pickerCatalog.map((item) => item.id))
      const persistedSliderIds = sliderIds.filter((id) => validIds.has(id))
      const persistedShowcases = showcases.map((showcase) => ({
        ...showcase,
        itemIds: showcase.itemIds.filter((id) => validIds.has(id)),
      }))
      const skipped = sliderIds.length - persistedSliderIds.length

      const persistedCustomBlocks = customBlocks.map((block) => ({
        ...block,
        itemIds:
          block.type === 'contentRow'
            ? (block.itemIds ?? []).filter((id) => validIds.has(id))
            : block.itemIds ?? [],
      }))

      const data = await saveLandingPageConfig({
        hero,
        sections,
        layout,
        sliderIds: persistedSliderIds,
        monthlyWinnerIds: monthlyWinnerIds.filter((id) => validIds.has(id)),
        studentPickIds: studentPickIds.filter((id) => validIds.has(id)),
        showcases: persistedShowcases,
        customBlocks: persistedCustomBlocks,
      })

      setHero(data.hero ?? hero)
      setSections(mergeLandingSections(data.sections))
      const savedCustomBlocks = data.customBlocks ?? customBlocks
      setCustomBlocks(savedCustomBlocks)
      setLayout(
        normalizeLandingLayout(
          data.layout,
          savedCustomBlocks.map((block) => block.id),
        ),
      )
      setSliderIds(
        data.sliderContentIds?.length
          ? data.sliderContentIds
          : data.slider.map((item) => item.id),
      )
      setMonthlyWinnerIds(
        data.monthlyWinnerContentIds?.length
          ? data.monthlyWinnerContentIds
          : (data.monthlyWinners ?? []).map((item) => item.id),
      )
      setStudentPickIds(
        data.studentPickContentIds?.length
          ? data.studentPickContentIds
          : (data.studentPicks ?? []).map((item) => item.id),
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
      setMessage(
        skipped > 0
          ? `Kaydedildi. ${skipped} demo içerik slider'a eklenemedi — yalnızca veritabanındaki içerikler kullanılır.`
          : customBlocks.length > 0 && !data.customBlocks
            ? 'Kaydedildi. Özel bölümler sunucuda henüz desteklenmiyor — sineoda-api.zip güncellemesini yükleyin.'
            : 'Ana sayfa ayarları kaydedildi.',
      )
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 401) {
        setMessage('Oturum süresi doldu. Lütfen admin panelinden çıkış yapıp tekrar giriş yapın.')
      } else if (status === 403) {
        setMessage(err instanceof Error ? err.message : 'Admin yetkisi gerekli.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Kayıt başarısız.')
      }
    } finally {
      setSaving(false)
    }
  }

  const renderBlockEditor = (blockId: LandingLayoutBlockId) => {
    if (isCustomLandingBlockId(blockId)) {
      const id = blockId.slice('custom:'.length)
      const block = customBlocks.find((entry) => entry.id === id)
      if (!block) {
        return <p className="text-sm text-red-300">Özel bölüm bulunamadı.</p>
      }
      return (
        <AdminLandingCustomBlockEditor
          block={block}
          catalog={pickerCatalog}
          onChange={(next) => updateCustomBlock(id, next)}
          onRemove={() => removeCustomBlock(id)}
        />
      )
    }

    switch (blockId as BuiltInLandingBlockId) {
      case 'hero':
        return (
          <>
            <p className="text-sm text-sineoda-muted">
              Giriş yapmışken <code className="text-white/70">/</code> farklı bir sayfadır — önizleme
              için yukarıdaki butonu kullanın.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                <span className="text-sm text-white/85">Birincil link</span>
                <input
                  value={hero.ctaPrimaryLink ?? '/kayit'}
                  onChange={(event) => updateHero({ ctaPrimaryLink: event.target.value })}
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
              <label className="block space-y-2">
                <span className="text-sm text-white/85">İkincil link</span>
                <input
                  value={hero.ctaSecondaryLink ?? '/giris'}
                  onChange={(event) => updateHero({ ctaSecondaryLink: event.target.value })}
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
                <div className="mt-3">
                  <ImageUpload label="Görsel" value={hero.backgroundImage} onChange={setHeroImage} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Arka plan videosu</p>
                <div className="mt-3 space-y-2">
                  <VideoUpload label="Video" value={hero.backgroundVideo} onChange={setHeroVideo} />
                  {/youtube\.com|youtu\.be/i.test(hero.backgroundVideo) && (
                    <p className="text-xs text-amber-300">YouTube linki çalışmaz. Video dosyası yükleyin.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Katalog içeriğinden arka plan</p>
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
          </>
        )
      case 'slider':
        return (
          <>
            <p className="text-sm text-sineoda-muted">
              Filmler, diziler ve belgeseller sekmelerinden seçim yap.
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
              poolFilters={LANDING_CONTENT_POOL_FILTERS}
              defaultPool="platform"
              searchPlaceholder="Başlık, tür veya ID ile ara..."
            />
          </>
        )
      case 'studentPicks':
        return (
          <>
            <p className="text-sm text-sineoda-muted">
              Genç Sinema seçkisini buradan düzenleyin. Liste boş bırakılırsa onaylı Genç Sinema
              içerikleri otomatik gösterilir.
            </p>
            {studentPickIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {studentPickIds.map((contentId, index) => {
                  const item = studentCinemaCatalog.find((entry) => entry.id === contentId)
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
                      <span className="max-w-[140px] truncate text-xs text-white">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPickIds((current) => {
                            const next = [...current]
                            if (index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]]
                            return next
                          })
                        }}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentPickIds((current) => {
                            const next = [...current]
                            if (index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]]
                            return next
                          })
                        }}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setStudentPickIds((current) => current.filter((id) => id !== contentId))
                        }
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
              catalog={studentCinemaCatalog}
              selectedIds={studentPickIds}
              onToggle={(contentId) => {
                setStudentPickIds((current) =>
                  current.includes(contentId)
                    ? current.filter((id) => id !== contentId)
                    : [...current, contentId],
                )
              }}
              searchPlaceholder="Genç Sinema filmi ara..."
            />
          </>
        )
      case 'studentMonthlyWinners':
        return (
          <>
            <p className="text-sm text-sineoda-muted">
              Ayın birincilerini buradan seçin. Liste boş bırakılırsa Genç Sinema admin panelindeki
              &quot;Ayın birincisi&quot; rozetli filmler otomatik gösterilir.
            </p>
            {monthlyWinnerIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {monthlyWinnerIds.map((contentId, index) => {
                  const item = studentCinemaCatalog.find((entry) => entry.id === contentId)
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
                      <span className="max-w-[140px] truncate text-xs text-white">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyWinnerIds((current) => {
                            const next = [...current]
                            if (index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]]
                            return next
                          })
                        }}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyWinnerIds((current) => {
                            const next = [...current]
                            if (index < next.length - 1) [next[index], next[index + 1]] = [next[index + 1], next[index]]
                            return next
                          })
                        }}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMonthlyWinnerIds((current) => current.filter((id) => id !== contentId))
                        }
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
              catalog={studentCinemaCatalog}
              selectedIds={monthlyWinnerIds}
              onToggle={(contentId) => {
                setMonthlyWinnerIds((current) =>
                  current.includes(contentId)
                    ? current.filter((id) => id !== contentId)
                    : [...current, contentId],
                )
              }}
              searchPlaceholder="Genç Sinema filmi ara..."
            />
          </>
        )
      case 'showcases':
        return (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-sineoda-muted">
                Dizi, Film, Belgesel gibi sekmeler ve poster satırları
              </p>
              <button
                type="button"
                onClick={addShowcase}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                + Kategori Ekle
              </button>
            </div>
            <div className="space-y-4">
              {showcases.map((showcase, index) => (
                <section
                  key={showcase.id}
                  className="rounded-xl border border-white/10 bg-[#0d0f14] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <input
                        value={showcase.title}
                        onChange={(event) => updateShowcase(index, { title: event.target.value })}
                        placeholder="Başlık (ör. Dizi)"
                        className="rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
                      />
                      <select
                        value={showcase.icon}
                        onChange={(event) => updateShowcase(index, { icon: event.target.value })}
                        className="rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-white outline-none focus:border-sineoda-gold"
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
                    className="mt-3 w-full rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold"
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
                      catalog={filterCatalogByPool(pickerCatalog, poolForShowcaseIcon(showcase.icon))}
                      selectedIds={showcase.itemIds}
                      onToggle={(contentId) => toggleShowcaseItem(index, contentId)}
                      searchPlaceholder={`${ICON_OPTIONS.find((option) => option.value === showcase.icon)?.label ?? 'Kategori'} içeriği ara...`}
                    />
                  </div>
                </section>
              ))}
            </div>
          </>
        )
      default:
        if (isLandingContentBlock(blockId)) {
          return (
            <AdminLandingSectionBlock blockId={blockId} sections={sections} onChange={setSections} />
          )
        }
        return null
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
            Misafir tanıtım sayfası bölümleri. Sürükleyerek veya oklarla sırala — sıra{' '}
            <code className="text-white/70">/tanitim</code> sayfasına yansır.
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

      <div className="rounded-2xl border border-dashed border-white/15 bg-[#11141c]/60 px-4 py-4">
        <p className="text-sm text-sineoda-muted">
          Yeni bölüm ekleyin — tip seçin, içerik satırına film/dizi ekleyebilirsiniz. Sıralama ve
          gizle/göster anında kaydedilir; diğer değişiklikler için Kaydet&apos;e basın.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.entries(CUSTOM_BLOCK_TYPE_LABELS) as [LandingCustomBlockType, string][]).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => addCustomBlock(type)}
              className="rounded-lg border border-sineoda-gold/40 px-3 py-2 text-sm font-medium text-sineoda-gold hover:bg-sineoda-gold/10"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {layout.order.map((blockId, index) => (
          <CollapsibleAdminPanel
            key={blockId}
            panelId={`landing-block-${blockId}`}
            title={getLayoutBlockLabel(blockId, customBlocks)}
            subtitle={blockSubtitle(blockId)}
            expanded={expandedBlocks.has(blockId)}
            onToggle={() => toggleExpanded(blockId)}
            onMoveUp={() => moveBlock(index, -1)}
            onMoveDown={() => moveBlock(index, 1)}
            canMoveUp={index > 0}
            canMoveDown={index < layout.order.length - 1}
            hidden={layout.hidden.includes(blockId)}
            onToggleHidden={() => toggleBlockHidden(blockId)}
            draggable={!saving}
            isDragging={draggingBlockId === blockId}
            onDragStart={(event) => handleBlockDragStart(event, blockId)}
            onDragOver={(event) => handleBlockDragOver(event, blockId)}
            onDrop={handleBlockDrop}
            onDragEnd={handleBlockDragEnd}
          >
            {renderBlockEditor(blockId)}
          </CollapsibleAdminPanel>
        ))}
      </div>
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
  poolFilters,
  defaultPool = 'platform',
  searchPlaceholder = 'İçerik ara...',
  maxResults = 48,
}: {
  catalog: ContentItem[]
  selectedIds: string[]
  onToggle: (contentId: string) => void
  poolFilters?: Array<{ id: ContentPoolId; label: string }>
  defaultPool?: ContentPoolId
  searchPlaceholder?: string
  maxResults?: number
}) {
  const [query, setQuery] = useState('')
  const [poolFilter, setPoolFilter] = useState<ContentPoolId>(defaultPool)

  const filteredCatalog = useMemo(
    () => filterPickerCatalog(catalog, query, poolFilters ? poolFilter : undefined),
    [catalog, query, poolFilter, poolFilters],
  )

  const visibleItems = filteredCatalog.slice(0, maxResults)

  return (
    <div className="mt-4 space-y-3">
      {poolFilters && poolFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {poolFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setPoolFilter(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                poolFilter === filter.id
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
