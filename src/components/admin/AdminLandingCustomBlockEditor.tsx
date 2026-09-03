import { ImageUpload } from './ImageUpload'
import type { ContentItem } from '../../types/content'
import { resolveMediaUrl, type CekimNotlariSection } from '../../api/client'
import type { LandingCustomBlock, LandingCustomBlockType } from '../../constants/landingCustomBlocks'
import { CUSTOM_BLOCK_TYPE_LABELS } from '../../constants/landingCustomBlocks'
import { getContentDisplayLabel } from '../../constants/contentTypes'
import {
  filterCatalogByPool,
  isShootingNotesContent,
  LANDING_CONTENT_POOL_FILTERS,
  type ContentPoolId,
} from '../../utils/contentPools'
import { viewAllHrefForBlock, viewAllHrefForPool } from '../../utils/landingContentLinks'
import { normalizeLandingLink } from '../../utils/landingContentRow'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold'

function pickerThumb(item: ContentItem, poolFilter: ContentPoolId) {
  const horizontal =
    poolFilter === 'shooting_notes' ||
    isShootingNotesContent(item) ||
    poolFilter === 'film' ||
    poolFilter === 'belgesel' ||
    poolFilter === 'platform' ||
    poolFilter === 'kisa-film'
  return {
    src: horizontal ? item.backdrop || item.poster : item.poster,
    className: horizontal ? 'h-10 w-16 rounded object-cover' : 'h-12 w-8 rounded object-cover',
  }
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-white/85">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={inputClass} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
    </label>
  )
}

function ContentRowPicker({
  catalog,
  selectedIds,
  onChange,
  poolFilter = 'platform',
}: {
  catalog: ContentItem[]
  selectedIds: string[]
  onChange: (itemIds: string[]) => void
  poolFilter?: ContentPoolId
}) {
  const filteredCatalog = filterCatalogByPool(catalog, poolFilter)
  const toggle = (contentId: string) => {
    if (selectedIds.includes(contentId)) {
      onChange(selectedIds.filter((id) => id !== contentId))
      return
    }
    onChange([...selectedIds, contentId])
  }

  const move = (index: number, delta: number) => {
    const next = [...selectedIds]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-plooy-muted">Seçili içerikler (sıra önemli)</p>
          {selectedIds.map((contentId, index) => {
            const item = catalog.find((entry) => entry.id === contentId)
            if (!item) return null
            const thumb = pickerThumb(item, poolFilter)
            return (
              <div
                key={contentId}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#11141c] p-2"
              >
                <img src={resolveMediaUrl(thumb.src)} alt="" className={thumb.className} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-plooy-muted">{getContentDisplayLabel(item)}</p>
                </div>
                <button type="button" onClick={() => move(index, -1)} className="text-xs text-white/60 hover:text-white">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} className="text-xs text-white/60 hover:text-white">
                  ↓
                </button>
                <button type="button" onClick={() => toggle(contentId)} className="text-xs text-red-300 hover:text-red-200">
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      {filteredCatalog.length === 0 && (
        <p className="text-xs text-amber-200/90">
          Bu havuzda içerik yok. Çekim Notları için admin → Çekim Notları; diğerleri için İçerikler sayfasına bakın.
        </p>
      )}

      <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
        {filteredCatalog.map((item) => {
          const selected = selectedIds.includes(item.id)
          const thumb = pickerThumb(item, poolFilter)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={`flex items-center gap-3 rounded-lg border p-2 text-left transition ${
                selected ? 'border-plooy-gold/50 bg-plooy-gold/10' : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <img src={resolveMediaUrl(thumb.src)} alt="" className={thumb.className} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="text-xs text-plooy-muted">{getContentDisplayLabel(item)}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function AdminLandingCustomBlockEditor({
  block,
  catalog,
  cekimCategories = [],
  onChange,
  onRemove,
}: {
  block: LandingCustomBlock
  catalog: ContentItem[]
  cekimCategories?: CekimNotlariSection[]
  onChange: (block: LandingCustomBlock) => void
  onRemove: () => void
}) {
  const patch = (partial: Partial<LandingCustomBlock>) => onChange({ ...block, ...partial })

  const handleTypeChange = (type: LandingCustomBlockType) => {
    onChange({
      ...block,
      type,
      itemIds: block.itemIds ?? [],
      title: type === 'contentRow' && !block.title ? '' : block.title,
      ctaLabel: type === 'contentRow' && !block.ctaLabel ? 'Tümünü gör' : block.ctaLabel,
    })
  }

  if (block.type === 'contentRow') {
    const pool = block.contentPool ?? 'platform'

    const handlePoolChange = (contentPool: ContentPoolId) => {
      const filtered = filterCatalogByPool(catalog, contentPool)
      const allowed = new Set(filtered.map((item) => item.id))
      onChange({
        ...block,
        contentPool,
        sourceCategoryId: contentPool === 'shooting_notes' ? block.sourceCategoryId : undefined,
        ctaLink: viewAllHrefForPool(contentPool),
        itemIds: (block.itemIds ?? []).filter((id) => allowed.has(id)),
      })
    }

    const handleCategoryChange = (sourceCategoryId: string) => {
      if (!sourceCategoryId) {
        patch({ sourceCategoryId: undefined })
        return
      }
      const section = cekimCategories.find((entry) => entry.id === sourceCategoryId)
      patch({
        sourceCategoryId,
        contentPool: 'shooting_notes',
        itemIds: section?.items.map((item) => item.id) ?? [],
        title: block.title.trim() ? block.title : section?.title ?? block.title,
        ctaLink: viewAllHrefForBlock({ contentPool: 'shooting_notes', sourceCategoryId, ctaLink: '' }),
        adminLabel: block.adminLabel === 'İçerik satırı' ? (section?.title ?? 'Çekim Notları') : block.adminLabel,
      })
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-plooy-muted">Film/dizi poster satırı — misafir ana sayfada gösterilir</p>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
          >
            Bölümü sil
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Başlık (misafir ana sayfada)"
            value={block.title || block.adminLabel}
            onChange={(heading) =>
              patch({
                title: heading,
                adminLabel: heading,
              })
            }
          />
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Bölüm tipi</span>
            <select value={block.type} onChange={(event) => handleTypeChange(event.target.value as LandingCustomBlockType)} className={inputClass}>
              {Object.entries(CUSTOM_BLOCK_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs text-plooy-muted">
          Yatay poster satırı — filmler geniş (landscape) kart olarak listelenir.
        </p>
        <label className="block space-y-2">
          <span className="text-sm text-white/85">İçerik havuzu</span>
          <select
            value={pool}
            onChange={(event) => handlePoolChange(event.target.value as ContentPoolId)}
            className={inputClass}
          >
            {LANDING_CONTENT_POOL_FILTERS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {pool === 'shooting_notes' && cekimCategories.length === 0 && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            Çekim Notları kategorisi bulunamadı. Admin → Çekim Notları sayfasından video ekleyin; sayfayı yenileyin.
          </p>
        )}
        {pool === 'shooting_notes' && cekimCategories.length > 0 && (
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Çekim Notları kategorisi</span>
            <select
              value={block.sourceCategoryId ?? ''}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Kategori seçin (videolar otomatik gelir)</option>
              {cekimCategories.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title} ({section.items.length} video)
                </option>
              ))}
            </select>
          </label>
        )}
        <Field label="Etiket (opsiyonel)" value={block.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} />
        <Field label="Kısa açıklama (opsiyonel)" value={block.body} onChange={(body) => patch({ body })} multiline />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Buton metni (opsiyonel)" value={block.ctaLabel} onChange={(ctaLabel) => patch({ ctaLabel })} />
          <Field
            label="Buton linki"
            value={block.ctaLink}
            onChange={(ctaLink) => patch({ ctaLink: normalizeLandingLink(ctaLink) })}
          />
        </div>

        <ContentRowPicker
          catalog={catalog}
          selectedIds={block.itemIds ?? []}
          onChange={(itemIds) => patch({ itemIds })}
          poolFilter={pool}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-plooy-muted">Admin panelinde görünen bölüm adı</p>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
        >
          Bölümü sil
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Panel adı" value={block.adminLabel} onChange={(adminLabel) => patch({ adminLabel })} />
        <label className="block space-y-2">
          <span className="text-sm text-white/85">Bölüm tipi</span>
          <select value={block.type} onChange={(event) => handleTypeChange(event.target.value as LandingCustomBlockType)} className={inputClass}>
            {Object.entries(CUSTOM_BLOCK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Field label="Etiket (küçük üst metin)" value={block.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} />
      <Field label="Başlık" value={block.title} onChange={(title) => patch({ title })} />
      <Field label="Metin" value={block.body} onChange={(body) => patch({ body })} multiline />

      {(block.type === 'imageText' || block.type === 'ctaBanner') && (
        <ImageUpload label="Görsel (opsiyonel)" value={block.image} onChange={(image) => patch({ image })} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Birincil buton" value={block.ctaLabel} onChange={(ctaLabel) => patch({ ctaLabel })} />
        <Field label="Birincil link" value={block.ctaLink} onChange={(ctaLink) => patch({ ctaLink })} />
        <Field
          label="İkincil buton"
          value={block.ctaSecondaryLabel}
          onChange={(ctaSecondaryLabel) => patch({ ctaSecondaryLabel })}
        />
        <Field
          label="İkincil link"
          value={block.ctaSecondaryLink}
          onChange={(ctaSecondaryLink) => patch({ ctaSecondaryLink })}
        />
      </div>
    </div>
  )
}
