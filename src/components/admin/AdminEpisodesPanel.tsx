import { useEffect, useMemo, useState } from 'react'
import {
  bulkCreateEpisodes,
  createEpisode,
  deleteEpisode,
  fetchEpisodes,
  updateEpisode,
} from '../../api/client'
import type { Episode } from '../../types/content'
import { nextEpisodeNumber, parseBulkLines, sortEpisodes } from '../../utils/episodes'

interface AdminEpisodesPanelProps {
  contentId: string
  isVertical?: boolean
}

const EMPTY = {
  season: 1,
  episode: 1,
  title: '',
  description: '',
  duration: '',
  videoUrl: '',
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function AdminEpisodesPanel({ contentId, isVertical = false }: AdminEpisodesPanelProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [bulkSeason, setBulkSeason] = useState(1)
  const [bulkCount, setBulkCount] = useState(isVertical ? 40 : 8)
  const [bulkDuration, setBulkDuration] = useState(isVertical ? '4 dk' : '45 dk')
  const [bulkPrefix, setBulkPrefix] = useState('Bölüm')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkTitles, setBulkTitles] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [message, setMessage] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { title: string; duration: string; videoUrl: string }>>(
    {},
  )

  const load = async () => {
    const data = await fetchEpisodes(contentId)
    const sorted = sortEpisodes(data.episodes)
    setEpisodes(sorted)
    setDrafts(
      Object.fromEntries(
        sorted.map((episode) => [
          episode.id,
          { title: episode.title, duration: episode.duration, videoUrl: episode.videoUrl },
        ]),
      ),
    )
    setLoading(false)
  }

  const bulkStartEpisode = useMemo(
    () => nextEpisodeNumber(episodes, bulkSeason),
    [episodes, bulkSeason],
  )

  const sortedEpisodes = useMemo(() => sortEpisodes(episodes), [episodes])

  const existingSeasons = useMemo(
    () =>
      [...new Set(sortedEpisodes.map((episode) => episode.season))].sort((a, b) => a - b),
    [sortedEpisodes],
  )

  const nextNewSeason = useMemo(
    () => (existingSeasons.length > 0 ? Math.max(...existingSeasons) + 1 : 1),
    [existingSeasons],
  )

  const selectBulkSeason = (seasonNumber: number) => {
    setBulkSeason(seasonNumber)
    setMessage('')
  }

  useEffect(() => {
    void load()
  }, [contentId])

  useEffect(() => {
    if (existingSeasons.length === 0) {
      setBulkSeason(1)
      return
    }
    if (!existingSeasons.includes(bulkSeason) && bulkSeason > nextNewSeason) {
      setBulkSeason(nextNewSeason)
    }
  }, [existingSeasons, bulkSeason, nextNewSeason])

  useEffect(() => {
    setBulkCount(isVertical ? 40 : 8)
    setBulkDuration(isVertical ? '4 dk' : '45 dk')
  }, [isVertical])

  const handleAdd = async () => {
    if (!form.title.trim()) return
    setMessage('')
    try {
      await createEpisode(contentId, form)
      setForm(EMPTY)
      await load()
      setMessage('Bölüm eklendi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bölüm eklenemedi.')
    }
  }

  const handleBulkCreate = async () => {
    if (bulkCount < 1 || bulkCount > 100) return
    setBulkLoading(true)
    setMessage('')
    try {
      const titleLines = splitLines(bulkTitles)
      const titles =
        titleLines.length > 0 ? parseBulkLines(bulkTitles, bulkCount) : undefined
      const videoUrls = bulkUrls.trim() ? parseBulkLines(bulkUrls, bulkCount) : undefined

      const result = await bulkCreateEpisodes(contentId, {
        season: bulkSeason,
        count: bulkCount,
        startEpisode: bulkStartEpisode,
        titlePrefix: bulkPrefix.trim() || 'Bölüm',
        duration: bulkDuration.trim() || (isVertical ? '4 dk' : '45 dk'),
        titles,
        videoUrls,
      })

      await load()
      setBulkTitles('')
      setBulkUrls('')

      const skippedCount = result.skippedCount ?? 0
      if (skippedCount > 0) {
        setMessage(
          `${result.createdCount} bölüm eklendi (S${bulkSeason} B${result.startEpisode}${result.endEpisode ? `–B${result.endEpisode}` : ''}). ${skippedCount} bölüm zaten vardı, atlandı.`,
        )
      } else {
        setMessage(
          `${result.createdCount} bölüm eklendi (S${bulkSeason} B${result.startEpisode}${result.endEpisode ? `–B${result.endEpisode}` : ''}).`,
        )
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Toplu bölüm eklenemedi.')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSaveEpisode = async (episode: Episode) => {
    const draft = drafts[episode.id]
    if (!draft) return
    setSavingId(episode.id)
    try {
      await updateEpisode(episode.id, {
        title: draft.title.trim() || episode.title,
        duration: draft.duration.trim(),
        videoUrl: draft.videoUrl.trim(),
      })
      await load()
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bölüm silinsin mi?')) return
    await deleteEpisode(id)
    await load()
  }

  const updateDraft = (id: string, field: 'title' | 'duration' | 'videoUrl', value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }))
  }

  const renderEpisodeRow = (episode: Episode) => {
    const draft = drafts[episode.id] ?? {
      title: episode.title,
      duration: episode.duration,
      videoUrl: episode.videoUrl,
    }
    const dirty =
      draft.title !== episode.title ||
      draft.duration !== episode.duration ||
      draft.videoUrl !== episode.videoUrl

    return (
      <div key={episode.id} className="space-y-2 rounded-lg border border-white/10 bg-[#0d0f14] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-white">
            B{episode.episode}
            {!draft.videoUrl.trim() && (
              <span className="ml-2 text-xs font-normal text-amber-300">Video linki yok</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => void handleDelete(episode.id)}
            className="text-xs text-red-300 hover:underline"
          >
            Sil
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
          <input
            value={draft.title}
            onChange={(e) => updateDraft(episode.id, 'title', e.target.value)}
            placeholder="Bölüm adı"
            className={inputClass}
          />
          <input
            value={draft.duration}
            onChange={(e) => updateDraft(episode.id, 'duration', e.target.value)}
            placeholder="Süre"
            className={inputClass}
          />
        </div>
        <input
          value={draft.videoUrl}
          onChange={(e) => updateDraft(episode.id, 'videoUrl', e.target.value)}
          placeholder="Bu bölümün video linki"
          className={inputClass}
        />
        <button
          type="button"
          disabled={!dirty || savingId === episode.id}
          onClick={() => void handleSaveEpisode(episode)}
          className="rounded-lg bg-sineoda-gold/15 px-3 py-1.5 text-xs font-semibold text-sineoda-gold disabled:opacity-40"
        >
          {savingId === episode.id ? 'Kaydediliyor…' : 'Bu bölümü kaydet'}
        </button>
      </div>
    )
  }

  if (loading) return <p className="text-sm text-sineoda-muted">Bölümler yükleniyor...</p>

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <h2 className="text-lg font-semibold text-white">
        {isVertical ? 'Dikey Dizi Bölümleri' : 'Dizi Bölümleri'}
      </h2>
      {message && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85">
          {message}
        </p>
      )}

      <div className="rounded-xl border border-sineoda-gold/20 bg-sineoda-gold/5 p-4">
        <h3 className="text-sm font-semibold text-sineoda-gold">Toplu Bölüm Oluştur</h3>
        <p className="mt-1 text-xs text-sineoda-muted">
          2. sezon eklemek için aşağıdan <strong className="text-white/90">Sezon 2</strong> seç veya{' '}
          <strong className="text-white/90">+ Yeni Sezon</strong> kullan. Aynı dizi kaydına kalır; yeni dizi
          oluşturmana gerek yok.
        </p>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sineoda-muted">
            Hangi sezona ekliyorsun?
          </p>
          <div className="flex flex-wrap gap-2">
            {existingSeasons.map((seasonNumber) => {
              const count = sortedEpisodes.filter((episode) => episode.season === seasonNumber).length
              return (
                <button
                  key={seasonNumber}
                  type="button"
                  onClick={() => selectBulkSeason(seasonNumber)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    bulkSeason === seasonNumber
                      ? 'bg-sineoda-gold text-sineoda-bg'
                      : 'bg-white/10 text-white/85 hover:bg-white/15'
                  }`}
                >
                  Sezon {seasonNumber}
                  <span className="ml-1 text-xs opacity-80">({count} bölüm)</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => selectBulkSeason(nextNewSeason)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                bulkSeason === nextNewSeason && !existingSeasons.includes(bulkSeason)
                  ? 'bg-sineoda-gold text-sineoda-bg'
                  : 'border border-dashed border-sineoda-gold/40 bg-transparent text-sineoda-gold hover:bg-sineoda-gold/10'
              }`}
            >
              + Sezon {nextNewSeason} ekle
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-sineoda-muted">
          Sezon {bulkSeason} için bölümler <strong className="text-white/90">B{bulkStartEpisode}</strong>
          numarasından başlayarak eklenecek.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-sineoda-muted">Sezon no</span>
            <input
              type="number"
              min={1}
              value={bulkSeason}
              onChange={(e) => setBulkSeason(Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-sineoda-muted">Bölüm sayısı</span>
            <input
              type="number"
              min={1}
              max={100}
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-sineoda-muted">Başlık öneki</span>
            <input
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
              placeholder="Bölüm"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-sineoda-muted">Süre</span>
            <input
              value={bulkDuration}
              onChange={(e) => setBulkDuration(e.target.value)}
              placeholder={isVertical ? '4 dk' : '45 dk'}
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <textarea
            value={bulkTitles}
            onChange={(e) => setBulkTitles(e.target.value)}
            rows={6}
            placeholder={'İsteğe bağlı başlıklar (her satır bir bölüm)\nPilot\nKampüs\nSır'}
            className={`${inputClass} resize-y`}
          />
          <textarea
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            rows={6}
            placeholder={
              'Video linkleri (her satır bir bölüm, sıra: B1, B2, B3…)\nhttps://...\nhttps://...\nhttps://...'
            }
            className={`${inputClass} resize-y`}
          />
        </div>
        <button
          type="button"
          disabled={bulkLoading}
          onClick={() => void handleBulkCreate()}
          className="mt-3 rounded-lg bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg disabled:opacity-60"
        >
          {bulkLoading ? 'Oluşturuluyor...' : `S${bulkSeason} · B${bulkStartEpisode}–B${bulkStartEpisode + bulkCount - 1} oluştur (${bulkCount} bölüm)`}
        </button>
      </div>

      {sortedEpisodes.length > 0 && (
        <p className="text-sm text-sineoda-muted">
          Toplam {sortedEpisodes.length} bölüm ·{' '}
          {[...new Set(sortedEpisodes.map((episode) => episode.season))]
            .sort((a, b) => a - b)
            .map((season) => `S${season}: ${sortedEpisodes.filter((episode) => episode.season === season).length}`)
            .join(' · ')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-sineoda-muted">Sezon (tek bölüm)</span>
          <input
            type="number"
            min={1}
            value={form.season}
            onChange={(e) => setForm((f) => ({ ...f, season: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-sineoda-muted">Bölüm no</span>
          <input
            type="number"
            min={1}
            value={form.episode}
            onChange={(e) => setForm((f) => ({ ...f, episode: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Bölüm adı"
          className={`${inputClass} sm:col-span-2`}
        />
        <input
          value={form.duration}
          onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          placeholder={isVertical ? 'Süre (ör. 4 dk)' : 'Süre'}
          className={inputClass}
        />
        <input
          value={form.videoUrl}
          onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
          placeholder="Stream URL"
          className={inputClass}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleAdd()}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
      >
        + Tek Bölüm Ekle
      </button>

      <div className="space-y-4">
        {existingSeasons.length > 0
          ? existingSeasons.map((seasonNumber) => {
              const seasonEpisodes = sortedEpisodes.filter((episode) => episode.season === seasonNumber)
              return (
                <div key={seasonNumber} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Sezon {seasonNumber}
                    <span className="ml-2 font-normal text-sineoda-muted">· {seasonEpisodes.length} bölüm</span>
                  </h3>
                  {seasonEpisodes.map((episode) => renderEpisodeRow(episode))}
                </div>
              )
            })
          : null}
        {sortedEpisodes.length === 0 && (
          <p className="text-sm text-sineoda-muted">Henüz bölüm eklenmedi. Yukarıdan toplu oluşturabilirsiniz.</p>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold'
