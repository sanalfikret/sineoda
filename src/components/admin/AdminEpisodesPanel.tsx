import { useEffect, useState } from 'react'
import { bulkCreateEpisodes, createEpisode, deleteEpisode, fetchEpisodes } from '../../api/client'
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

  const load = async () => {
    const data = await fetchEpisodes(contentId)
    setEpisodes(data.episodes)
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
      const customTitles = bulkTitles
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      await bulkCreateEpisodes(contentId, {
        season: bulkSeason,
        count: bulkCount,
        titlePrefix: bulkPrefix.trim() || 'Bölüm',
        duration: bulkDuration.trim() || (isVertical ? '4 dk' : '45 dk'),
        titles: customTitles.length > 0 ? customTitles : undefined,
      })
      await load()
      setBulkTitles('')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bölüm silinsin mi?')) return
    await deleteEpisode(id)
    await load()
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
          {isVertical
            ? 'Dikey diziler için 20–80 kısa bölüm oluşturabilirsiniz. Video URL\'lerini sonra tek tek güncelleyin.'
            : 'Sezon başına istediğiniz kadar bölüm oluşturun. Video URL\'lerini sonra tek tek güncelleyebilirsiniz.'}
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
        <textarea
          value={bulkTitles}
          onChange={(e) => setBulkTitles(e.target.value)}
          rows={4}
          placeholder={'İsteğe bağlı: Her satıra bir bölüm başlığı\nİlk Mesaj\nKampüs\nSır'}
          className={`${inputClass} mt-3 resize-y`}
        />
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

      <div className="space-y-2">
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-white">
                S{episode.season} B{episode.episode} · {episode.title}
              </p>
              <p className="max-w-md truncate text-xs text-sineoda-muted">{episode.videoUrl}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(episode.id)}
              className="text-xs text-red-300 hover:underline"
            >
              Sil
            </button>
          </div>
        ))}
        {episodes.length === 0 && (
          <p className="text-sm text-sineoda-muted">Henüz bölüm eklenmedi. Yukarıdan toplu oluşturabilirsiniz.</p>
        )}
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 text-white outline-none focus:border-sineoda-gold'
