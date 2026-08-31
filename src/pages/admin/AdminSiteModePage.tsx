import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminSiteMode, updateAdminSiteMode, type SiteModeConfig } from '../../api/client'
import { useSiteMode } from '../../context/SiteModeContext'
import { datetimeLocalToIso, formatLaunchDateTr, toDatetimeLocalValue } from '../../utils/countdown'

export function AdminSiteModePage() {
  const { refreshSiteMode } = useSiteMode()
  const [form, setForm] = useState<SiteModeConfig | null>(null)
  const [launchLocal, setLaunchLocal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void fetchAdminSiteMode()
      .then(({ siteMode }) => {
        setForm(siteMode)
        setLaunchLocal(toDatetimeLocalValue(siteMode.launchAt))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    setMessage('')
    try {
      const launchAt = datetimeLocalToIso(launchLocal)
      const { siteMode } = await updateAdminSiteMode({
        ...form,
        launchAt,
      })
      setForm(siteMode)
      setLaunchLocal(toDatetimeLocalValue(siteMode.launchAt))
      await refreshSiteMode()
      setMessage('Yakında modu kaydedildi.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Yakında Modu</h1>
        <p className="mt-2 text-sm text-plooy-muted">
          Reklam kampanyası için coming soon sayfası. Yapımcı başvuruları açık kalır; izleyici üyeliği ve
          katalog kapalıdır. Admin olarak siz siteyi normal test edebilirsiniz.
        </p>
      </div>

      {message && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">{message}</p>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#11141c] p-5 space-y-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => current && { ...current, enabled: event.target.checked })}
            className="mt-1 accent-plooy-gold"
          />
          <span>
            <span className="block font-medium text-white">Yakında modu aktif</span>
            <span className="mt-1 block text-sm text-plooy-muted">
              Açıkken ziyaretçiler ana sayfada geri sayım görür. Siz admin olarak tüm siteye erişmeye devam
              edersiniz.
            </span>
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Açılış tarihi ve saati</span>
          <input
            type="datetime-local"
            value={launchLocal}
            onChange={(event) => setLaunchLocal(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
          />
          {form.launchAt && (
            <span className="text-xs text-plooy-muted">
              Önizleme: {formatLaunchDateTr(datetimeLocalToIso(launchLocal) ?? form.launchAt)}
            </span>
          )}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Başlık</span>
          <input
            value={form.headline}
            onChange={(event) => setForm((current) => current && { ...current, headline: event.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-white">Alt metin</span>
          <textarea
            value={form.subheadline}
            onChange={(event) =>
              setForm((current) => current && { ...current, subheadline: event.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-4 py-2.5 outline-none focus:border-plooy-gold"
          />
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.allowViewerSignup}
            onChange={(event) =>
              setForm((current) => current && { ...current, allowViewerSignup: event.target.checked })
            }
            className="mt-1 accent-plooy-gold"
          />
          <span>
            <span className="block font-medium text-white">İzleyici kaydına izin ver</span>
            <span className="mt-1 block text-sm text-plooy-muted">
              Kapalıyken /kayit ve üyelik akışı coming soon modunda engellenir.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm text-white hover:bg-white/5"
          >
            Canlı önizleme
          </Link>
        </div>
      </section>
    </div>
  )
}
