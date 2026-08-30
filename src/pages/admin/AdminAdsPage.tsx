import { useEffect, useMemo, useState } from 'react'
import {
  createAdminAdCampaign,
  deleteAdminAdCampaign,
  fetchAdminAdCampaigns,
  fetchAdminCatalog,
  toggleAdminAdCampaign,
  updateAdminAdCampaign,
} from '../../api/client'
import { VideoUpload } from '../../components/admin/VideoUpload'
import type { AdminContentItem } from '../../types/content'
import type { AdCampaign, AdCampaignFormInput, AdFrequency, AdSkipMode } from '../../types/ads'
import { AD_FREQUENCY_LABELS, AD_SKIP_LABELS } from '../../types/ads'

const emptyForm = (): AdCampaignFormInput => ({
  name: '',
  videoUrl: '',
  kidsVideoUrl: '',
  targetAll: true,
  contentIds: [],
  frequency: 'once',
  skipMode: 'skippable',
  skipAfterSeconds: 5,
  startsAt: '',
  endsAt: '',
  isActive: false,
})

function toDatetimeLocal(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  if (!value) return null
  return new Date(value).toISOString()
}

function campaignToForm(campaign: AdCampaign): AdCampaignFormInput {
  return {
    name: campaign.name,
    videoUrl: campaign.videoUrl,
    kidsVideoUrl: campaign.kidsVideoUrl ?? '',
    targetAll: campaign.targetAll,
    contentIds: campaign.contentIds,
    frequency: campaign.frequency,
    skipMode: campaign.skipMode,
    skipAfterSeconds: campaign.skipAfterSeconds,
    startsAt: toDatetimeLocal(campaign.startsAt),
    endsAt: toDatetimeLocal(campaign.endsAt),
    isActive: campaign.isActive,
  }
}

export function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [catalog, setCatalog] = useState<AdminContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdCampaignFormInput>(emptyForm())
  const [filmSearch, setFilmSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [ads, content] = await Promise.all([fetchAdminAdCampaigns(), fetchAdminCatalog()])
      setCampaigns(ads.campaigns)
      setCatalog(content.catalog.filter((item) => item.isPublished))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredCatalog = useMemo(() => {
    const query = filmSearch.trim().toLowerCase()
    if (!query) return catalog
    return catalog.filter((item) => item.title.toLowerCase().includes(query))
  }, [catalog, filmSearch])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFilmSearch('')
    setError('')
    setSuccess('')
  }

  const startEdit = (campaign: AdCampaign) => {
    setEditingId(campaign.id)
    setForm(campaignToForm(campaign))
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleContent = (contentId: string) => {
    setForm((current) => ({
      ...current,
      contentIds: current.contentIds.includes(contentId)
        ? current.contentIds.filter((id) => id !== contentId)
        : [...current.contentIds, contentId],
    }))
  }

  const selectAllFilms = () => {
    setForm((current) => ({ ...current, contentIds: catalog.map((item) => item.id) }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const payload = {
      ...form,
      startsAt: fromDatetimeLocal(form.startsAt),
      endsAt: fromDatetimeLocal(form.endsAt),
    } as AdCampaignFormInput & { startsAt: string | null; endsAt: string | null }

    try {
      if (editingId) {
        await updateAdminAdCampaign(editingId, payload as AdCampaignFormInput)
        setSuccess('Kampanya güncellendi.')
      } else {
        await createAdminAdCampaign(payload as AdCampaignFormInput)
        setSuccess('Kampanya oluşturuldu.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (campaign: AdCampaign) => {
    try {
      await toggleAdminAdCampaign(campaign.id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Durum değiştirilemedi.')
    }
  }

  const handleDelete = async (campaign: AdCampaign) => {
    if (!window.confirm(`"${campaign.name}" kampanyasını silmek istediğine emin misin?`)) return
    try {
      await deleteAdminAdCampaign(campaign.id)
      if (editingId === campaign.id) resetForm()
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Reklam Kampanyaları</h1>
        <p className="mt-1 max-w-3xl text-sm text-plooy-muted">
          Film öncesi sponsor reklamları. Abonelere de gösterilir; sıklık, hedef filmler ve atlama
          kuralları tamamen senin kontrolünde.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {editingId ? 'Kampanyayı düzenle' : 'Yeni kampanya'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
            >
              Yeni kampanya
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Kampanya / marka adı</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
              placeholder="Örn. Festival sponsoru"
              required
            />
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 rounded border-white/20"
            />
            <span className="text-sm text-white/85">Kampanya aktif</span>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <VideoUpload
            label="Yetişkin / genel reklam videosu"
            value={form.videoUrl}
            onChange={(url) => setForm({ ...form, videoUrl: url })}
          />
          <VideoUpload
            label="Çocuk profili reklam videosu (opsiyonel)"
            value={form.kidsVideoUrl}
            onChange={(url) => setForm({ ...form, kidsVideoUrl: url })}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Gösterim sıklığı</span>
            <select
              value={form.frequency}
              onChange={(event) =>
                setForm({ ...form, frequency: event.target.value as AdFrequency })
              }
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            >
              {Object.entries(AD_FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-white/85">Atlama modu</span>
            <select
              value={form.skipMode}
              onChange={(event) => setForm({ ...form, skipMode: event.target.value as AdSkipMode })}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            >
              {Object.entries(AD_SKIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {form.skipMode === 'skippable' && (
            <label className="block space-y-2">
              <span className="text-sm text-white/85">Geç butonu (saniye)</span>
              <input
                type="number"
                min={0}
                max={60}
                value={form.skipAfterSeconds}
                onChange={(event) =>
                  setForm({ ...form, skipAfterSeconds: Number(event.target.value) || 0 })
                }
                className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
              />
            </label>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Başlangıç (opsiyonel)</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm text-white/85">Bitiş (opsiyonel)</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white/85">
              <input
                type="radio"
                checked={form.targetAll}
                onChange={() => setForm({ ...form, targetAll: true, contentIds: [] })}
              />
              Tüm içerikler
            </label>
            <label className="flex items-center gap-2 text-sm text-white/85">
              <input
                type="radio"
                checked={!form.targetAll}
                onChange={() => setForm({ ...form, targetAll: false })}
              />
              Seçili filmler
            </label>
          </div>

          {!form.targetAll && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <input
                  value={filmSearch}
                  onChange={(event) => setFilmSearch(event.target.value)}
                  placeholder="Film ara..."
                  className="min-w-[12rem] flex-1 rounded-lg border border-white/10 bg-[#11141c] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={selectAllFilms}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                >
                  Tümünü seç
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, contentIds: [] }))}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                >
                  Seçimi temizle
                </button>
              </div>
              <p className="text-xs text-plooy-muted">{form.contentIds.length} film seçili</p>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
                {filteredCatalog.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={form.contentIds.includes(item.id)}
                      onChange={() => toggleContent(item.id)}
                    />
                    <span className="text-sm text-white/85">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {success && <p className="text-sm text-emerald-300">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kampanya oluştur'}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-plooy-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Kampanya</th>
              <th className="px-4 py-3 font-medium">Hedef</th>
              <th className="px-4 py-3 font-medium">Sıklık</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-plooy-muted">
                  Yükleniyor...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-plooy-muted">
                  Henüz kampanya yok.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{campaign.name}</p>
                    <p className="text-xs text-plooy-muted">
                      {campaign.skipMode === 'mandatory'
                        ? 'Zorunlu reklam'
                        : `${campaign.skipAfterSeconds}s sonra geç`}
                      {campaign.kidsVideoUrl ? ' · Çocuk reklamı var' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {campaign.targetAll ? 'Tüm içerikler' : `${campaign.contentIds.length} film`}
                  </td>
                  <td className="px-4 py-3 text-white/80">{AD_FREQUENCY_LABELS[campaign.frequency]}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleToggle(campaign)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        campaign.isActive
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {campaign.isActive ? 'Aktif' : 'Kapalı'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(campaign)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(campaign)}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
