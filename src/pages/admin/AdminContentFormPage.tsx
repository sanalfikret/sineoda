import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ImageUpload } from '../../components/admin/ImageUpload'
import { VideoUpload } from '../../components/admin/VideoUpload'
import { SubtitleUpload } from '../../components/admin/SubtitleUpload'
import { AdminEpisodesPanel } from '../../components/admin/AdminEpisodesPanel'
import { FestivalCreditsEditor } from '../../components/admin/FestivalCreditsEditor'
import { resolveMediaUrl, fetchAdminCatalog } from '../../api/client'
import { useContent } from '../../context/ContentContext'
import { BROWSE_GENRES, CONTENT_GENRES, STREAM_PROVIDERS } from '../../constants/genres'
import { buildSubtitles, subtitlesToForm } from '../../utils/subtitles'
import { buildCredits, creditsToForm } from '../../utils/credits'
import { buildFestivals, festivalsToForm } from '../../utils/duration'
import type { FestivalEntry } from '../../constants/festivals'
import { CONTENT_TYPES, isSeriesContent } from '../../constants/contentTypes'
import { BRAND_STUDIOS } from '../../constants/brand'
import type { ContentType } from '../../types/content'
import { toDateInputValue } from '../../utils/license'
import { defaultScheduledDateTime, toDateTimeLocalValue } from '../../utils/publish'

const RATINGS = ['Genel', '7+', '13+', '16+', '18+']
const todayInput = () => new Date().toISOString().slice(0, 10)

const LICENSE_DEFAULTS = {
  contentAddedAt: todayInput(),
  licenseUnlimited: true,
  licenseExpiresAt: '',
}

const EMPTY_FORM = {
  title: '',
  description: '',
  year: new Date().getFullYear(),
  duration: '',
  durationMinutes: '',
  rating: '13+',
  type: 'film' as ContentType,
  genres: '',
  poster: '',
  backdrop: '',
  videoUrl: '',
  trailerUrl: '',
  streamProvider: 'custom',
  videoFormat: 'standard' as 'standard' | 'vertical',
  isNew: false,
  featured: false,
  subtitleTr: '',
  subtitleEn: '',
  directors: '',
  producers: '',
  cast: '',
  studio: '',
  festivals: [] as FestivalEntry[],
  ...LICENSE_DEFAULTS,
  publishMode: 'now' as 'now' | 'scheduled',
  publishedAt: defaultScheduledDateTime(),
}

const VERTICAL_PRESET = {
  type: 'dizi' as ContentType,
  videoFormat: 'vertical' as const,
  genres: 'Dikey, Romantik, Dram',
  duration: '8 bölüm',
}

const STANDUP_PRESET = {
  type: 'stand-up' as ContentType,
  videoFormat: 'standard' as const,
  genres: 'Stand-up, Komedi',
  rating: '16+',
}

type ContentPreset = 'film' | 'dizi' | 'belgesel' | 'kisa-film' | 'stand-up' | 'dikey'

function buildInitialForm(options: { vertical?: boolean; standup?: boolean } = {}) {
  if (options.vertical) return { ...EMPTY_FORM, ...VERTICAL_PRESET }
  if (options.standup) return { ...EMPTY_FORM, ...STANDUP_PRESET }
  return EMPTY_FORM
}

function applyPreset(preset: ContentPreset) {
  if (preset === 'dikey') {
    return { ...EMPTY_FORM, ...VERTICAL_PRESET }
  }
  return {
    ...EMPTY_FORM,
    type: preset,
    videoFormat: 'standard' as const,
  }
}

export function AdminContentFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isVerticalNew = searchParams.get('dikey') === '1'
  const isStandUpNew = searchParams.get('standup') === '1'
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { getContentById, addContent, updateContent } = useContent()
  const [form, setForm] = useState(() => buildInitialForm({ vertical: isVerticalNew && !id, standup: isStandUpNew && !id }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return

    void fetchAdminCatalog()
      .then(({ catalog }) => {
        const item = catalog.find((entry) => entry.id === id)
        if (!item) return

        setForm({
          title: item.title,
          description: item.description,
          year: item.year,
          duration: item.duration,
          durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
          rating: item.rating,
          type: item.type,
          genres: item.genres.join(', '),
          poster: item.poster,
          backdrop: item.backdrop,
          videoUrl: item.videoUrl,
          trailerUrl: item.trailerUrl ?? '',
          streamProvider: item.streamProvider ?? 'custom',
          videoFormat: item.videoFormat ?? 'standard',
          isNew: item.isNew ?? false,
          featured: item.featured ?? false,
          contentAddedAt: toDateInputValue(item.contentAddedAt) || todayInput(),
          licenseUnlimited: item.licenseUnlimited,
          licenseExpiresAt: toDateInputValue(item.licenseExpiresAt),
          publishMode: item.isScheduled ? 'scheduled' : 'now',
          publishedAt: toDateTimeLocalValue(item.publishedAt) || defaultScheduledDateTime(),
          ...subtitlesToForm(item.subtitles),
          ...creditsToForm(item.credits),
          festivals: festivalsToForm(item.festivals),
        })
      })
      .catch(() => {
        const item = getContentById(id)
        if (!item) return
        setForm((current) => ({
          ...current,
          title: item.title,
          description: item.description,
          year: item.year,
          duration: item.duration,
          durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
          rating: item.rating,
          type: item.type,
          genres: item.genres.join(', '),
          poster: item.poster,
          backdrop: item.backdrop,
          videoUrl: item.videoUrl,
          trailerUrl: item.trailerUrl ?? '',
          streamProvider: item.streamProvider ?? 'custom',
          videoFormat: item.videoFormat ?? 'standard',
          isNew: item.isNew ?? false,
          featured: item.featured ?? false,
          ...subtitlesToForm(item.subtitles),
          ...creditsToForm(item.credits),
          festivals: festivalsToForm(item.festivals),
        }))
      })
  }, [id, getContentById])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!form.title.trim() || !form.poster.trim() || !form.videoUrl.trim()) {
      setError('Başlık, poster ve video zorunludur.')
      return
    }

    if (!form.contentAddedAt) {
      setError('Platforma eklenme tarihi zorunludur.')
      return
    }

    if (!form.licenseUnlimited && !form.licenseExpiresAt) {
      setError('Telif sınırsız değilse bitiş tarihi girilmelidir.')
      return
    }

    if (form.publishMode === 'scheduled' && !form.publishedAt) {
      setError('Planlanan yayın için tarih ve saat seçmelisin.')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      year: form.year,
      duration:
        form.type === 'dizi'
          ? form.duration.trim()
          : form.duration.trim() || (Number(form.durationMinutes) > 0 ? `${form.durationMinutes} dk` : ''),
      durationMinutes:
        form.type === 'dizi' ? null : Number(form.durationMinutes) > 0 ? Number(form.durationMinutes) : null,
      rating: form.rating,
      type: form.type,
      genres: form.genres
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean),
      poster: form.poster.trim(),
      backdrop: form.backdrop.trim() || form.poster.trim(),
      videoUrl: form.videoUrl.trim(),
      trailerUrl: form.trailerUrl.trim() || form.videoUrl.trim(),
      streamProvider: form.streamProvider,
      videoFormat: form.videoFormat,
      isNew: form.isNew,
      featured: form.featured,
      contentAddedAt: form.contentAddedAt,
      licenseUnlimited: form.licenseUnlimited,
      licenseExpiresAt: form.licenseUnlimited ? null : form.licenseExpiresAt,
      publishNow: form.publishMode === 'now',
      publishedAt:
        form.publishMode === 'scheduled'
          ? new Date(form.publishedAt).toISOString()
          : undefined,
      subtitles: buildSubtitles(form.subtitleTr, form.subtitleEn),
      credits: buildCredits(form),
      festivals: buildFestivals(form.festivals),
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateContent(id, payload)
      } else {
        await addContent(payload)
      }
      navigate('/admin/icerikler')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const applyContentPreset = (preset: ContentPreset) => {
    setForm(applyPreset(preset))
  }

  const activePreset: ContentPreset | null = !isEdit
    ? form.videoFormat === 'vertical'
      ? 'dikey'
      : form.type
    : null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/admin/icerikler" className="text-sm text-plooy-muted hover:text-white">
          ← İçeriklere dön
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">
          {isEdit
            ? form.videoFormat === 'vertical'
              ? 'Dikey Diziyi Düzenle'
              : 'İçeriği Düzenle'
            : isVerticalNew || form.videoFormat === 'vertical'
              ? 'Yeni Dikey Dizi'
              : isStandUpNew || form.type === 'stand-up'
                ? 'Yeni Stand-up'
                : 'Yeni İçerik'}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
        {!isEdit && (
          <section className="space-y-2">
            <p className="text-sm font-medium text-white">İçerik türü seç</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'film', label: 'Film' },
                  { id: 'dizi', label: 'Dizi' },
                  { id: 'belgesel', label: 'Belgesel' },
                  { id: 'kisa-film', label: 'Kısa Film' },
                  { id: 'stand-up', label: 'Stand-up' },
                  { id: 'dikey', label: 'Dikey Dizi' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyContentPreset(preset.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activePreset === preset.id
                      ? preset.id === 'dikey'
                        ? 'bg-plooy-gold text-plooy-bg'
                        : 'bg-white text-plooy-bg'
                      : preset.id === 'dikey'
                        ? 'border border-plooy-gold/50 bg-plooy-gold/10 text-plooy-gold hover:bg-plooy-gold/20'
                        : 'bg-white/10 text-white/85 hover:bg-white/15'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlık *">
            <input
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="İçerik Türü">
            <select
              value={form.type}
              onChange={(event) => {
                const type = event.target.value as ContentType
                setForm((current) => ({
                  ...current,
                  type,
                  videoFormat:
                    current.videoFormat === 'vertical' && type !== 'dizi'
                      ? 'standard'
                      : current.videoFormat,
                }))
              }}
              className={inputClass}
            >
              {CONTENT_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Açıklama">
          <textarea
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            rows={5}
            placeholder="Filmin veya dizinin kısa özeti..."
            className={inputClass}
          />
        </Field>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Künye</h3>
            <p className="mt-1 text-xs text-plooy-muted">
              Yönetmen, yapımcı ve oyuncular ayrı kutularda. Her satıra bir isim yazabilirsiniz.
            </p>
          </div>

          <CreditBox
            label="Yönetmen"
            value={form.directors}
            onChange={(value) => update('directors', value)}
            placeholder="Uğur Bayraktar"
            rows={3}
          />
          <CreditBox
            label="Yapımcı"
            value={form.producers}
            onChange={(value) => update('producers', value)}
            placeholder="Yapımcı adı"
            rows={3}
          />
          <CreditBox
            label="Oyuncular"
            value={form.cast}
            onChange={(value) => update('cast', value)}
            placeholder="Her satıra bir oyuncu adı"
            rows={5}
          />

          <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
            <Field label="Stüdyo / Yapım Şirketi">
              <input
                value={form.studio}
                onChange={(event) => update('studio', event.target.value)}
                placeholder={BRAND_STUDIOS}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        <FestivalCreditsEditor
          entries={form.festivals}
          onChange={(festivals) => update('festivals', festivals)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Yıl">
            <input
              type="number"
              value={form.year}
              onChange={(event) => update('year', Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Süre">
            {form.type === 'dizi' ? (
              <input
                value={form.duration}
                onChange={(event) => update('duration', event.target.value)}
                placeholder="8 bölüm"
                className={inputClass}
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(event) => update('durationMinutes', event.target.value)}
                  placeholder="92"
                  className={inputClass}
                />
                <p className="text-xs text-plooy-muted">Film süresi (dakika). Örn: 92 → 1s 32dk</p>
              </div>
            )}
          </Field>
          <Field label="Yaş Sınırı">
            <select
              value={form.rating}
              onChange={(event) => update('rating', event.target.value)}
              className={inputClass}
            >
              {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Kategori Etiketleri">
          <input
            value={form.genres}
            onChange={(event) => update('genres', event.target.value)}
            placeholder="Dram, Belgesel, Stand-up"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTENT_GENRES.map((genre) => {
              const selected = form.genres
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
                .includes(genre)
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    const current = form.genres
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean)
                    if (current.includes(genre)) {
                      update('genres', current.filter((value) => value !== genre).join(', '))
                    } else {
                      update('genres', [...current, genre].join(', '))
                    }
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    selected
                      ? 'bg-plooy-gold text-plooy-bg'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {genre}
                </button>
              )
            })}
          </div>
          <p className="mt-1.5 text-xs text-plooy-muted">
            Filtreler: {BROWSE_GENRES.join(', ')}
          </p>
        </Field>

        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-emerald-200">Yayın Zamanı</h3>
            <p className="mt-1 text-xs text-plooy-muted">
              Yayınlanan içerikler aktif üyeler tarafından izlenebilir. Planlanan içerikler belirlenen
              saatte otomatik görünür.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-white/85">
              <input
                type="radio"
                name="publishMode"
                checked={form.publishMode === 'now'}
                onChange={() => update('publishMode', 'now')}
                className="accent-plooy-gold"
              />
              Hemen yayınla
            </label>

            <label className="flex items-center gap-3 text-sm text-white/85">
              <input
                type="radio"
                name="publishMode"
                checked={form.publishMode === 'scheduled'}
                onChange={() => update('publishMode', 'scheduled')}
                className="accent-plooy-gold"
              />
              İleri tarihte yayınla
            </label>

            {form.publishMode === 'scheduled' && (
              <Field label="Yayın tarihi ve saati *">
                <input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(event) => update('publishedAt', event.target.value)}
                  className={inputClass}
                  required
                />
              </Field>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-amber-200">Telif &amp; Yayın Bilgileri</h3>
            <p className="mt-1 text-xs text-plooy-muted">
              Bu alanlar yalnızca admin panelinde görünür; üyeler bu bilgileri görmez.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platforma Eklenme Tarihi *">
              <input
                type="date"
                value={form.contentAddedAt}
                onChange={(event) => update('contentAddedAt', event.target.value)}
                className={inputClass}
                required
              />
            </Field>

            <div>
              <Field label="Telif Bitiş Tarihi">
                <input
                  type="date"
                  value={form.licenseExpiresAt}
                  onChange={(event) => update('licenseExpiresAt', event.target.value)}
                  disabled={form.licenseUnlimited}
                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                />
              </Field>
              <label className="mt-3 flex items-center gap-2 text-sm text-white/85">
                <input
                  type="checkbox"
                  checked={form.licenseUnlimited}
                  onChange={(event) => update('licenseUnlimited', event.target.checked)}
                  className="h-4 w-4 rounded accent-plooy-gold"
                />
                Sınırsız telif (bitiş tarihi yok)
              </label>
            </div>
          </div>
        </section>

        <ImageUpload
          label="Poster *"
          value={form.poster}
          onChange={(url) => update('poster', url)}
        />
        {form.videoFormat === 'vertical' && (
          <p className="-mt-3 text-xs text-plooy-gold">
            Dikey dizi için portre (9:16) poster kullanın.
          </p>
        )}

        <ImageUpload
          label="Arka Plan"
          value={form.backdrop}
          onChange={(url) => update('backdrop', url)}
        />

        <Field label="Stream Sağlayıcı">
          <select
            value={form.streamProvider}
            onChange={(event) => update('streamProvider', event.target.value)}
            className={inputClass}
          >
            {STREAM_PROVIDERS.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.label}
              </option>
            ))}
          </select>
        </Field>

        <VideoUpload
          label="Stream URL / Video *"
          value={form.videoUrl}
          onChange={(url) => update('videoUrl', url)}
        />
        <p className="-mt-3 text-xs text-plooy-muted">
          YouTube, MP4 veya HLS (.m3u8) linki yapıştır. Test için YouTube da çalışır.
        </p>

        <VideoUpload
          label="Fragman URL"
          value={form.trailerUrl}
          onChange={(url) => update('trailerUrl', url)}
        />
        <p className="-mt-3 text-xs text-plooy-muted">
          Ana sayfa ve öne çıkan alanda oynatılır. Boş bırakılırsa ana video kullanılır.
        </p>

        <SubtitleUpload
          label="Türkçe altyazı (.srt / .vtt)"
          value={form.subtitleTr}
          onChange={(url) => update('subtitleTr', url)}
        />
        <SubtitleUpload
          label="İngilizce altyazı (.srt / .vtt)"
          value={form.subtitleEn}
          onChange={(url) => update('subtitleEn', url)}
        />
        <p className="-mt-3 text-xs text-plooy-muted">
          .srt dosyası yüklersen otomatik .vtt&apos;ye çevrilir. İzlerken CC butonuyla açılır.
        </p>

        <Field label="Video Formatı">
          <select
            value={form.videoFormat}
            onChange={(event) => {
              const videoFormat = event.target.value as 'standard' | 'vertical'
              setForm((current) => {
                if (videoFormat !== 'vertical') {
                  return { ...current, videoFormat }
                }
                const genres = current.genres
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean)
                return {
                  ...current,
                  videoFormat,
                  type: 'dizi',
                  genres: genres.includes('Dikey') ? current.genres : [...genres, 'Dikey'].join(', '),
                }
              })
            }}
            className={inputClass}
          >
            <option value="standard">Standart (yatay 16:9)</option>
            <option value="vertical">Dikey dizi (9:16)</option>
          </select>
        </Field>
        {form.videoFormat === 'vertical' && (
          <div className="rounded-xl border border-plooy-gold/20 bg-plooy-gold/5 px-4 py-3 text-sm text-white/80">
            <p className="font-semibold text-plooy-gold">Dikey dizi ipuçları</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-plooy-muted">
              <li>Poster ve kapak görseli 9:16 (dikey) oranında olmalı — örn. 400×711 px</li>
              <li>Bölümler genelde 1–5 dakika; süre alanına &quot;4 dk&quot; gibi kısa değerler girin</li>
              <li>İzleyici yukarı/aşağı kaydırarak bölümler arasında geçiş yapar</li>
            </ul>
          </div>
        )}

        <label className="flex items-center gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(event) => update('isNew', event.target.checked)}
            className="h-4 w-4 rounded accent-plooy-gold"
          />
          &quot;Yeni&quot; rozeti göster (30 gün)
        </label>

        <label className="flex items-center gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => update('featured', event.target.checked)}
            className="h-4 w-4 rounded accent-plooy-gold"
          />
          Öne çıkan içerik olarak ayarla
        </label>

        {form.poster && (
          <div className="flex gap-4">
            <img src={resolveMediaUrl(form.poster)} alt="" className="h-36 w-24 rounded-lg object-cover" />
            {form.backdrop && (
              <img src={resolveMediaUrl(form.backdrop)} alt="" className="h-36 flex-1 rounded-lg object-cover" />
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
          <Link
            to="/admin/icerikler"
            className="rounded-lg border border-white/10 px-5 py-3 text-sm text-white/80 hover:bg-white/5"
          >
            İptal
          </Link>
        </div>
      </form>

      {isEdit && id && (isSeriesContent(form.type) || form.videoFormat === 'vertical') && (
        <AdminEpisodesPanel contentId={id} isVertical={form.videoFormat === 'vertical'} />
      )}
    </div>
  )
}

function CreditBox({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows: number
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0f14] p-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white">{label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${inputClass} resize-y min-h-[88px]`}
        />
      </label>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-white/85">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-plooy-gold'
