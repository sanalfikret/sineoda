import { useEffect, useState } from 'react'
import {
  bulkCreateEpisodes,
  createEpisode,
  deleteEpisode,
  fetchEpisodes,
  updateEpisode,
} from '../../api/client'
import type { Episode } from '../../types/content'

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
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { title: string; duration: string; videoUrl: string }>>(
    {},
  )

  const load = async () => {
    const data = await fetchEpisodes(contentId)
    setEpisodes(data.episodes)
    setDrafts(
      Object.fromEntries(
        data.episodes.map((episode) => [
          episode.id,
          { title: episode.title, duration: episode.duration, videoUrl: episode.videoUrl },
        ]),
      ),
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [contentId])

  useEffect(() => {
    setBulkCount(isVertical ? 40 : 8)
    setBulkDuration(isVertical ? '4 dk' : '45 dk')
  }, [isVertical])

  const handleAdd = async () => {
    if (!form.title.trim() || !form.videoUrl.trim()) return
    await createEpisode(contentId, form)
    setForm(EMPTY)
    await load()
  }

  const handleBulkCreate = async () => {
    if (bulkCount < 1 || bulkCount > 100) return
    setBulkLoading(true)
    try {
      await bulkCreateEpisodes(contentId, {
        season: bulkSeason,
        count: bulkCount,
        titlePrefix: bulkPrefix.trim() || 'Bölüm',
        duration: bulkDuration.trim() || (isVertical ? '4 dk' : '45 dk'),
        titles: splitLines(bulkTitles),
        videoUrls: bulkUrls.split('\n').map((line) => line.trim()),
      })
      await load()
      setBulkTitles('')
      setBulkUrls('')
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

  if (loading) return <p className="text-sm text-sineoda-muted">Bölümler yükleniyor...</p>

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#11141c] p-5">
      <h2 className="text-lg font-semibold text-white">
        {isVertical ? 'Dikey Dizi Bölümleri' : 'Dizi Bölümleri'}
      </h2>

      <div className="rounded-xl border border-sineoda-gold/20 bg-sineoda-gold/5 p-4">
        <h3 className="text-sm font-semibold text-sineoda-gold">Toplu Bölüm Oluştur</h3>
        <p className="mt-1 text-xs text-sineoda-muted">
          Sezon, sayı ve süreyi bir kez gir. Başlık ve video linklerini alt alta yapıştır — her satır bir
          bölüm. Linkleri şimdi vermezsen sonra listeden tek tek yapıştırırsın; formu baştan doldurmana gerek yok.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            type="number"
            min={1}
            value={bulkSeason}
            onChange={(e) => setBulkSeason(Number(e.target.value))}
            placeholder="Sezon"
            className={inputClass}
          />
          <input
            type="number"
            min={1}
            max={100}
            value={bulkCount}
            onChange={(e) => setBulkCount(Number(e.target.value))}
            placeholder="Bölüm sayısı"
            className={inputClass}
          />
          <input
            value={bulkPrefix}
            onChange={(e) => setBulkPrefix(e.target.value)}
            placeholder="Başlık öneki"
            className={inputClass}
          />
          <input
            value={bulkDuration}
            onChange={(e) => setBulkDuration(e.target.value)}
            placeholder="Süre"
            className={inputClass}
          />
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
          {bulkLoading ? 'Oluşturuluyor...' : `Sezon ${bulkSeason} · ${bulkCount} bölüm oluştur`}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="number"
          min={1}
          value={form.season}
          onChange={(e) => setForm((f) => ({ ...f, season: Number(e.target.value) }))}
          placeholder="Sezon"
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          value={form.episode}
          onChange={(e) => setForm((f) => ({ ...f, episode: Number(e.target.value) }))}
          placeholder="Bölüm"
          className={inputClass}
        />
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

      <div className="space-y-3">
        {episodes.map((episode) => {
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
                  S{episode.season} B{episode.episode}
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
        })}
        {episodes.length === 0 && (
          <p className="text-sm text-sineoda-muted">Henüz bölüm eklenmedi. Yukarıdan toplu oluşturabilirsiniz.</p>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold'
