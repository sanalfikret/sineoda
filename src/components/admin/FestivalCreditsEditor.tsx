import { useState } from 'react'
import { ImageUpload } from './ImageUpload'
import {
  FESTIVAL_FORMAT_LABELS,
  FESTIVAL_KIND_LABELS,
  FESTIVAL_PRESETS,
  type FestivalEntry,
  type FestivalEntryKind,
  type FestivalFormat,
} from '../../constants/festivals'
import { createEmptyFestivalEntry } from '../../utils/duration'

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-sineoda-gold'

export function FestivalCreditsEditor({
  entries,
  onChange,
  allowLaurelUpload = true,
}: {
  entries: FestivalEntry[]
  onChange: (entries: FestivalEntry[]) => void
  allowLaurelUpload?: boolean
}) {
  const [preset, setPreset] = useState('')

  const updateEntry = (id: string, patch: Partial<FestivalEntry>) => {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((entry) => entry.id !== id))
  }

  const addEntry = () => {
    onChange([...entries, createEmptyFestivalEntry()])
  }

  return (
    <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Festivaller & Ödüller</h3>
        <p className="mt-1 text-xs text-sineoda-muted">
          Resmi seçkiler ve aldığı ödülleri ekleyin. İzleyici künyesinde laurel rozetleri olarak görünür.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-sineoda-muted">Henüz festival kaydı yok.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={entry.id} className="space-y-3 rounded-lg border border-white/10 bg-[#0d0f14]/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/90">Kayıt {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="rounded-lg bg-red-500/10 px-3 py-1 text-xs text-red-300 hover:bg-red-500/20"
                >
                  Sil
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-sm text-white/85">Festival adı *</span>
                  <input
                    list={`festival-presets-${entry.id}`}
                    value={entry.festivalName}
                    onChange={(event) => updateEntry(entry.id, { festivalName: event.target.value })}
                    placeholder="Örn: Cannes Film Festival"
                    className={inputClass}
                  />
                  <datalist id={`festival-presets-${entry.id}`}>
                    {FESTIVAL_PRESETS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-white/85">Yıl *</span>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={entry.year}
                    onChange={(event) => updateEntry(entry.id, { year: Number(event.target.value) })}
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-white/85">Tür</span>
                  <select
                    value={entry.kind}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        kind: event.target.value as FestivalEntryKind,
                        ...(event.target.value === 'selection' ? { awardName: '' } : {}),
                      })
                    }
                    className={inputClass}
                  >
                    {Object.entries(FESTIVAL_KIND_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm text-white/85">Metraj</span>
                  <select
                    value={entry.format ?? ''}
                    onChange={(event) =>
                      updateEntry(entry.id, {
                        format: (event.target.value || undefined) as FestivalFormat | undefined,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Belirtilmedi</option>
                    {Object.entries(FESTIVAL_FORMAT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                {entry.kind === 'award' && (
                  <label className="block space-y-2 sm:col-span-2">
                    <span className="text-sm text-white/85">Ödül adı *</span>
                    <input
                      value={entry.awardName ?? ''}
                      onChange={(event) => updateEntry(entry.id, { awardName: event.target.value })}
                      placeholder="Örn: En İyi Kısa Film"
                      className={inputClass}
                    />
                  </label>
                )}

                {allowLaurelUpload && (
                  <div className="sm:col-span-2">
                    <ImageUpload
                      label="Laurel logosu (opsiyonel)"
                      value={entry.laurelUrl ?? ''}
                      onChange={(laurelUrl) => updateEntry(entry.id, { laurelUrl })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addEntry}
          className="rounded-lg border border-sineoda-gold/40 px-4 py-2 text-sm font-medium text-sineoda-gold hover:bg-sineoda-gold/10"
        >
          + Festival / ödül ekle
        </button>
        {FESTIVAL_PRESETS.length > 0 && (
          <>
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value)}
              className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
            >
              <option value="">Hızlı ekle…</option>
              {FESTIVAL_PRESETS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!preset}
              onClick={() => {
                if (!preset) return
                onChange([
                  ...entries,
                  createEmptyFestivalEntry({ festivalName: preset, kind: 'selection' }),
                ])
                setPreset('')
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-40"
            >
              Seçkiyi ekle
            </button>
          </>
        )}
      </div>
    </section>
  )
}
