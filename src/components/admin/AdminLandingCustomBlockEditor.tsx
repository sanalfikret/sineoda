import { ImageUpload } from './ImageUpload'
import type { LandingCustomBlock, LandingCustomBlockType } from '../../constants/landingCustomBlocks'
import { CUSTOM_BLOCK_TYPE_LABELS } from '../../constants/landingCustomBlocks'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold'

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

export function AdminLandingCustomBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: LandingCustomBlock
  onChange: (block: LandingCustomBlock) => void
  onRemove: () => void
}) {
  const patch = (partial: Partial<LandingCustomBlock>) => onChange({ ...block, ...partial })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sineoda-muted">Admin panelinde görünen bölüm adı</p>
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
          <select
            value={block.type}
            onChange={(event) => patch({ type: event.target.value as LandingCustomBlockType })}
            className={inputClass}
          >
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
