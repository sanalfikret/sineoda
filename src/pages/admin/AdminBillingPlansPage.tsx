import { useEffect, useState } from 'react'
import {
  fetchAdminBillingPlans,
  saveAdminBillingPlans,
  type AdminBillingPlan,
  type BillingPlan,
} from '../../api/client'

type PlanDraft = {
  name: string
  price: number
  featuresText: string
  popular: boolean
  enabled: boolean
}

function toDraft(plan: BillingPlan): PlanDraft {
  return {
    name: plan.name,
    price: plan.price,
    featuresText: plan.features.join('\n'),
    popular: Boolean(plan.popular),
    enabled: plan.enabled !== false,
  }
}

function intervalLabel(interval: BillingPlan['interval']) {
  if (interval === 'once') return 'Tek seferlik'
  if (interval === 'year') return 'Yıllık'
  return 'Aylık'
}

function audienceLabel(audience?: BillingPlan['audience']) {
  return audience === 'creator' ? 'Yapımcı / Genç Sinema' : 'İzleyici aboneliği'
}

export function AdminBillingPlansPage() {
  const [plans, setPlans] = useState<AdminBillingPlan[]>([])
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminBillingPlans()
      .then((data) => {
        setPlans(data.plans)
        setDrafts(Object.fromEntries(data.plans.map((plan) => [plan.id, toDraft(plan)])))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Planlar yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const updateDraft = (planId: string, patch: Partial<PlanDraft>) => {
    setDrafts((current) => ({
      ...current,
      [planId]: { ...current[planId], ...patch },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const payload = Object.fromEntries(
        plans.map((plan) => {
          const draft = drafts[plan.id]
          return [
            plan.id,
            {
              name: draft.name.trim(),
              price: draft.price,
              features: draft.featuresText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
              popular: plan.id === 'student' ? draft.popular : undefined,
              enabled: draft.enabled,
            },
          ]
        }),
      )
      const data = await saveAdminBillingPlans(payload)
      setPlans(data.plans)
      setDrafts(Object.fromEntries(data.plans.map((plan) => [plan.id, toDraft(plan)])))
      setMessage('Planlar kaydedildi. Fiyatlandırma sayfası ve ödeme akışı güncellendi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Abonelik & Başvuru Planları</h1>
          <p className="mt-2 max-w-2xl text-sm text-plooy-muted">
            Fiyatları, plan adlarını ve madde listesini buradan değiştirin. Değişiklikler fiyatlandırma
            sayfası, yapımcı ödeme ekranı ve checkout tutarlarına yansır.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map((plan) => {
          const draft = drafts[plan.id]
          if (!draft) return null
          return (
            <section key={plan.id} className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-plooy-gold">
                    {audienceLabel(plan.audience)}
                  </p>
                  <p className="text-xs text-plooy-muted">{intervalLabel(plan.interval)}</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={(event) => updateDraft(plan.id, { enabled: event.target.checked })}
                    className="rounded border-white/20"
                  />
                  Yayında
                </label>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-plooy-muted">Plan adı</span>
                  <input
                    value={draft.name}
                    onChange={(event) => updateDraft(plan.id, { name: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-plooy-muted">Fiyat (₺)</span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.price}
                    onChange={(event) =>
                      updateDraft(plan.id, { price: Math.max(1, Number(event.target.value) || 1) })
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-plooy-muted">
                    Özellikler (her satır bir madde)
                  </span>
                  <textarea
                    value={draft.featuresText}
                    onChange={(event) => updateDraft(plan.id, { featuresText: event.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold"
                  />
                </label>

                {plan.id === 'student' && (
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={draft.popular}
                      onChange={(event) => updateDraft(plan.id, { popular: event.target.checked })}
                      className="rounded border-white/20"
                    />
                    &quot;Öğrencilere özel&quot; rozeti göster
                  </label>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
