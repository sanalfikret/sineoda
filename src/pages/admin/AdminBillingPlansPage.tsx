import { useEffect, useMemo, useState } from 'react'
import {
  createAdminGiftCode,
  deleteAdminGiftCode,
  fetchAdminBillingPlans,
  fetchAdminGiftCodeRedemptions,
  fetchAdminGiftCodes,
  saveAdminBillingPlans,
  setAdminGiftCodeEnabled,
  type AdminBillingPlan,
  type BillingPlan,
  type GiftCode,
  type GiftCodeKind,
  type GiftCodeRedemption,
} from '../../api/client'

type PlanDraft = {
  name: string
  price: number
  featuresText: string
  popular: boolean
  enabled: boolean
  interval: BillingPlan['interval']
  audience: NonNullable<BillingPlan['audience']>
  requiresStudentId: boolean
  campaignLabel: string
  sectionLabel: string
  registrationNotice: string
}

type CustomPlanDraft = PlanDraft & { id: string }

type GiftDraft = {
  code: string
  label: string
  kind: GiftCodeKind
  planId: string
  durationMonths: number
  durationYears: number
  discountPercent: number
  discountAmount: number
  maxUses: number
  expiresAt: string
}

function giftCodeSummary(code: GiftCode, planName: (id: string) => string) {
  if (code.kind === 'discount') {
    const amount = code.discountPercent > 0 ? `%${code.discountPercent} indirim` : `₺${code.discountAmount} indirim`
    return `${amount} · ${code.planId ? planName(code.planId) : 'tüm izleyici planları'}`
  }
  const duration = code.durationYears > 0 ? `${code.durationYears} yıl` : `${code.durationMonths} ay`
  return `${duration} ücretsiz · ${planName(code.planId)}`
}

function toDraft(plan: BillingPlan): PlanDraft {
  return {
    name: plan.name,
    price: plan.price,
    featuresText: plan.features.join('\n'),
    popular: Boolean(plan.popular),
    enabled: plan.enabled !== false,
    interval: plan.interval,
    audience: plan.audience ?? 'viewer',
    requiresStudentId: Boolean(plan.requiresStudentId),
    campaignLabel: plan.campaignLabel ?? '',
    sectionLabel:
      plan.sectionLabel ??
      (plan.audience === 'creator' ? 'Yapımcı Yönetmen' : 'İzleyici aboneliği'),
    registrationNotice: plan.registrationNotice ?? '',
  }
}

function intervalLabel(interval: BillingPlan['interval']) {
  if (interval === 'once') return 'Tek seferlik'
  if (interval === 'year') return 'Yıllık'
  return 'Aylık'
}

function emptyCustomPlan(): CustomPlanDraft {
  return {
    id: `campaign-${Date.now()}`,
    name: 'Kampanya Planı',
    price: 59,
    featuresText: 'Tüm içerikler\nHD yayın',
    popular: false,
    enabled: true,
    interval: 'month',
    audience: 'viewer',
    requiresStudentId: false,
    campaignLabel: 'Kampanya',
    sectionLabel: 'Kampanya planı',
    registrationNotice: '',
  }
}

function emptyGiftDraft(planId: string, kind: GiftCodeKind = 'gift'): GiftDraft {
  return {
    code: '',
    label: '',
    kind,
    planId: kind === 'gift' ? planId : '',
    durationMonths: 1,
    durationYears: 0,
    discountPercent: 20,
    discountAmount: 0,
    maxUses: 1,
    expiresAt: '',
  }
}

function randomCode(prefix: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${out}`
}

export function AdminBillingPlansPage() {
  const [tab, setTab] = useState<'plans' | 'gifts'>('plans')
  const [plans, setPlans] = useState<AdminBillingPlan[]>([])
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({})
  const [customPlans, setCustomPlans] = useState<CustomPlanDraft[]>([])
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([])
  const [giftDraft, setGiftDraft] = useState<GiftDraft>(emptyGiftDraft('standard'))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [giftSaving, setGiftSaving] = useState(false)
  const [giftFilter, setGiftFilter] = useState<'all' | GiftCodeKind>('all')
  const [redemptionsFor, setRedemptionsFor] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<GiftCodeRedemption[]>([])
  const [redemptionsLoading, setRedemptionsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const viewerPlanOptions = useMemo(
    () => plans.filter((plan) => plan.audience === 'viewer').map((plan) => ({ id: plan.id, name: plan.name })),
    [plans],
  )

  useEffect(() => {
    Promise.all([fetchAdminBillingPlans(), fetchAdminGiftCodes()])
      .then(([planData, giftData]) => {
        setPlans(planData.plans)
        setDrafts(Object.fromEntries(planData.plans.map((plan) => [plan.id, toDraft(plan)])))
        setCustomPlans(
          planData.customPlans.map((plan) => ({
            id: plan.id,
            ...toDraft(plan),
          })),
        )
        setGiftCodes(giftData.codes)
        const firstViewer = planData.plans.find((plan) => plan.audience === 'viewer')?.id ?? 'standard'
        setGiftDraft(emptyGiftDraft(firstViewer))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const updateDraft = (planId: string, patch: Partial<PlanDraft>) => {
    setDrafts((current) => ({
      ...current,
      [planId]: { ...current[planId], ...patch },
    }))
  }

  const updateCustomPlan = (index: number, patch: Partial<CustomPlanDraft>) => {
    setCustomPlans((current) =>
      current.map((plan, i) => (i === index ? { ...plan, ...patch } : plan)),
    )
  }

  const handleSavePlans = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const payloadPlans = Object.fromEntries(
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
              popular: draft.popular,
              enabled: draft.enabled,
              interval: draft.interval,
              requiresStudentId: draft.requiresStudentId,
              campaignLabel: draft.campaignLabel.trim() || undefined,
              sectionLabel: draft.sectionLabel.trim() || undefined,
              registrationNotice: draft.registrationNotice.trim() || undefined,
            },
          ]
        }),
      )

      const payloadCustom = customPlans.map((plan) => ({
        id: plan.id.trim(),
        name: plan.name.trim(),
        price: plan.price,
        interval: plan.interval,
        audience: plan.audience,
        features: plan.featuresText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        popular: plan.popular,
        requiresStudentId: plan.requiresStudentId,
        enabled: plan.enabled,
        campaignLabel: plan.campaignLabel.trim() || undefined,
        sectionLabel: plan.sectionLabel.trim() || undefined,
        registrationNotice: plan.registrationNotice.trim() || undefined,
      }))

      const data = await saveAdminBillingPlans({
        plans: payloadPlans,
        customPlans: payloadCustom,
      })
      setPlans(data.plans)
      setDrafts(Object.fromEntries(data.plans.map((plan) => [plan.id, toDraft(plan)])))
      setCustomPlans(
        data.customPlans.map((plan) => ({
          id: plan.id,
          ...toDraft(plan),
        })),
      )
      setMessage('Planlar kaydedildi. Fiyatlandırma sayfası ve ödeme akışı güncellendi.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateGiftCode = async () => {
    setGiftSaving(true)
    setMessage('')
    setError('')
    try {
      const result = await createAdminGiftCode({
        code: giftDraft.code,
        label: giftDraft.label,
        kind: giftDraft.kind,
        planId: giftDraft.planId,
        durationMonths: giftDraft.durationYears > 0 ? 0 : giftDraft.durationMonths,
        durationYears: giftDraft.durationYears,
        discountPercent: giftDraft.kind === 'discount' ? giftDraft.discountPercent : 0,
        discountAmount: giftDraft.kind === 'discount' ? giftDraft.discountAmount : 0,
        maxUses: giftDraft.maxUses,
        expiresAt: giftDraft.expiresAt || null,
      })
      setGiftCodes((current) => [result.code, ...current])
      setMessage(`${result.code.kind === 'discount' ? 'İndirim' : 'Hediye'} kodu oluşturuldu: ${result.code.code}`)
      setGiftDraft(emptyGiftDraft(viewerPlanOptions[0]?.id ?? 'standard', giftDraft.kind))
      setMessage(`Hediye kodu oluşturuldu: ${result.code.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kupon oluşturulamadı.')
    } finally {
      setGiftSaving(false)
    }
  }

  const handleDeleteGiftCode = async (code: GiftCode) => {
    if (!window.confirm(`"${code.code}" kodu silinsin mi?`)) return
    setError('')
    try {
      await deleteAdminGiftCode(code.id)
      setGiftCodes((current) => current.filter((entry) => entry.id !== code.id))
      if (redemptionsFor === code.id) setRedemptionsFor(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kupon silinemedi.')
    }
  }

  const toggleRedemptions = async (code: GiftCode) => {
    if (redemptionsFor === code.id) {
      setRedemptionsFor(null)
      return
    }
    setRedemptionsFor(code.id)
    setRedemptionsLoading(true)
    try {
      const result = await fetchAdminGiftCodeRedemptions(code.id)
      setRedemptions(result.redemptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kullanım listesi yüklenemedi.')
      setRedemptions([])
    } finally {
      setRedemptionsLoading(false)
    }
  }

  const planNameOf = (id: string) => plans.find((plan) => plan.id === id)?.name ?? id
  const visibleGiftCodes = giftCodes.filter((code) => giftFilter === 'all' || code.kind === giftFilter)

  const toggleGiftCode = async (code: GiftCode) => {
    setError('')
    try {
      const result = await setAdminGiftCodeEnabled(code.id, !code.enabled)
      setGiftCodes((current) => current.map((entry) => (entry.id === code.id ? result.code : entry)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kupon güncellenemedi.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-plooy-gold border-t-transparent" />
      </div>
    )
  }

  const renderPlanFields = (
    draft: PlanDraft,
    onChange: (patch: Partial<PlanDraft>) => void,
    options?: { showAudience?: boolean },
  ) => (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm text-plooy-muted">Bölüm başlığı (kart üstü)</span>
        <input
          value={draft.sectionLabel}
          onChange={(event) => onChange({ sectionLabel: event.target.value })}
          placeholder="Örn. Yapımcı Yönetmen, İzleyici aboneliği"
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm text-plooy-muted">Periyot</span>
          <select
            value={draft.interval}
            onChange={(event) =>
              onChange({ interval: event.target.value as BillingPlan['interval'] })
            }
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
          >
            <option value="month">Aylık abonelik</option>
            <option value="year">Yıllık abonelik</option>
            <option value="once">Tek seferlik ödeme</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-plooy-muted">Hedef kitle (teknik)</span>
          {options?.showAudience ? (
            <select
              value={draft.audience}
              onChange={(event) =>
                onChange({
                  audience: event.target.value as NonNullable<BillingPlan['audience']>,
                })
              }
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
            >
              <option value="viewer">İzleyici — fiyatlandırma sayfası</option>
              <option value="creator">Yapımcı Yönetmen / Genç Sinema — başvuru ödemesi</option>
            </select>
          ) : (
            <input
              value={
                draft.audience === 'creator'
                  ? 'Yapımcı Yönetmen / Genç Sinema (sabit)'
                  : 'İzleyici (sabit)'
              }
              readOnly
              className="w-full rounded-lg border border-white/10 bg-[#0d0f14]/70 px-3 py-2 text-sm text-white/60"
            />
          )}
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm text-plooy-muted">Plan adı</span>
        <input
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-plooy-muted">Fiyat (₺)</span>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.price}
          onChange={(event) =>
            onChange({ price: Math.max(0, Number(event.target.value) || 0) })
          }
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
        />
      </label>

      {draft.audience === 'creator' && (
        <label className="block">
          <span className="mb-1.5 block text-sm text-plooy-muted">
            Kayıt formu bilgi kutusu (mavi alan)
          </span>
          <textarea
            value={draft.registrationNotice}
            onChange={(event) => onChange({ registrationNotice: event.target.value })}
            rows={4}
            placeholder="Kayıt sonrası ₺{{price}} yapımcı başvuru ücreti ödenir..."
            className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold"
          />
          <span className="mt-1.5 block text-xs text-plooy-muted">
            Fiyat plan fiyatından otomatik gelir — metinde <code className="text-plooy-gold">{'{{price}}'}</code>{' '}
            kullanın. Boş bırakırsanız varsayılan metin gösterilir.
          </span>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm text-plooy-muted">Kampanya etiketi (isteğe bağlı)</span>
        <input
          value={draft.campaignLabel}
          onChange={(event) => onChange({ campaignLabel: event.target.value })}
          placeholder="Örn. Yılbaşı kampanyası"
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-plooy-muted">Özellikler (her satır bir madde)</span>
        <textarea
          value={draft.featuresText}
          onChange={(event) => onChange({ featuresText: event.target.value })}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus:border-plooy-gold"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={draft.popular}
          onChange={(event) => onChange({ popular: event.target.checked })}
          className="rounded border-white/20"
        />
        Öne çıkan / rozet göster
      </label>

      {draft.audience === 'viewer' && (
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={draft.requiresStudentId}
            onChange={(event) => onChange({ requiresStudentId: event.target.checked })}
            className="rounded border-white/20"
          />
          Öğrenci kimliği zorunlu
        </label>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Abonelik & Başvuru Planları</h1>
          <p className="mt-2 max-w-2xl text-sm text-plooy-muted">
            Periyot (aylık/yıllık/tek sefer), kampanya planları, hediye ve indirim kodlarını buradan yönetin.
          </p>
        </div>
        {tab === 'plans' && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSavePlans()}
            className="rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('plans')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'plans' ? 'bg-plooy-gold text-plooy-bg' : 'border border-white/10 text-white/80'
          }`}
        >
          Planlar
        </button>
        <button
          type="button"
          onClick={() => setTab('gifts')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'gifts' ? 'bg-plooy-gold text-plooy-bg' : 'border border-white/10 text-white/80'
          }`}
        >
          Hediye & İndirim Kodları
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

      {tab === 'plans' ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => {
              const draft = drafts[plan.id]
              if (!draft) return null
              return (
                <section key={plan.id} className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-plooy-gold">
                        {draft.sectionLabel || 'Plan'}
                      </p>
                      <p className="text-xs text-plooy-muted">{intervalLabel(draft.interval)}</p>
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
                  {renderPlanFields(draft, (patch) => updateDraft(plan.id, patch))}
                </section>
              )
            })}
          </div>

          <div className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Kampanya planları</h2>
                <p className="text-sm text-plooy-muted">
                  Yeni promosyon planı ekleyin — fiyatlandırma sayfasında görünür.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomPlans((current) => [...current, emptyCustomPlan()])}
                className="rounded-lg border border-plooy-gold/40 px-4 py-2 text-sm font-medium text-plooy-gold hover:bg-plooy-gold/10"
              >
                + Kampanya planı ekle
              </button>
            </div>

            <div className="grid gap-6">
              {customPlans.map((plan, index) => (
                <section key={plan.id} className="rounded-2xl border border-dashed border-plooy-gold/30 bg-[#11141c] p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-plooy-gold">
                      {plan.sectionLabel || 'Özel plan'}
                    </p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={plan.enabled}
                          onChange={(event) =>
                            updateCustomPlan(index, { enabled: event.target.checked })
                          }
                          className="rounded border-white/20"
                        />
                        Yayında
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomPlans((current) => current.filter((_, i) => i !== index))
                        }
                        className="text-sm text-red-300 hover:text-red-200"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  {renderPlanFields(plan, (patch) => updateCustomPlan(index, patch), { showAudience: true })}
                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-sm text-plooy-muted">Plan kimliği</span>
                    <input
                      value={plan.id}
                      onChange={(event) =>
                        updateCustomPlan(index, {
                          id: event.target.value
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]+/g, '-')
                            .slice(0, 48),
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 font-mono text-sm text-white outline-none focus:border-plooy-gold"
                    />
                  </label>
                </section>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
            <h2 className="text-lg font-semibold text-white">Yeni kod</h2>
            <p className="mt-1 text-sm text-plooy-muted">
              <strong className="text-white/80">Hediye:</strong> üye kodu girer, ödeme yapmadan seçtiğiniz kadar ay/yıl üyelik açılır.{' '}
              <strong className="text-white/80">İndirim:</strong> ödeme adımında fiyattan düşülür (%100 indirimde ödeme adımı atlanır).
            </p>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['gift', 'Hediye üyelik'],
                    ['discount', 'İndirim kodu'],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() =>
                      setGiftDraft((current) => ({
                        ...emptyGiftDraft(viewerPlanOptions[0]?.id ?? 'standard', kind),
                        code: current.code,
                        label: current.label,
                        maxUses: current.maxUses,
                        expiresAt: current.expiresAt,
                      }))
                    }
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      giftDraft.kind === kind ? 'bg-plooy-gold text-plooy-bg' : 'border border-white/10 text-white/80 hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm text-plooy-muted">Kupon kodu</span>
                <div className="flex gap-2">
                  <input
                    value={giftDraft.code}
                    onChange={(event) => setGiftDraft((current) => ({ ...current, code: event.target.value }))}
                    placeholder={giftDraft.kind === 'discount' ? 'FIRMA-INDIRIM-20' : 'PLOOY-HEDIYE-2026'}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 uppercase text-white outline-none focus:border-plooy-gold"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setGiftDraft((current) => ({ ...current, code: randomCode(current.kind === 'discount' ? 'INDIRIM' : 'HEDIYE') }))
                    }
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                  >
                    Rastgele
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-plooy-muted">Açıklama (admin notu)</span>
                <input
                  value={giftDraft.label}
                  onChange={(event) => setGiftDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Kurumsal hediye kartı — Ocak 2026"
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-plooy-muted">
                  {giftDraft.kind === 'discount' ? 'Geçerli plan' : 'Verilecek plan'}
                </span>
                <select
                  value={giftDraft.planId}
                  onChange={(event) => setGiftDraft((current) => ({ ...current, planId: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                >
                  {giftDraft.kind === 'discount' && <option value="">Tüm izleyici planları</option>}
                  {viewerPlanOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>

              {giftDraft.kind === 'discount' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-plooy-muted">İndirim yüzdesi (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={giftDraft.discountPercent}
                      onChange={(event) =>
                        setGiftDraft((current) => ({
                          ...current,
                          discountPercent: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                          discountAmount: 0,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-plooy-muted">Sabit indirim (₺)</span>
                    <input
                      type="number"
                      min={0}
                      value={giftDraft.discountAmount}
                      onChange={(event) =>
                        setGiftDraft((current) => ({
                          ...current,
                          discountAmount: Math.max(0, Number(event.target.value) || 0),
                          discountPercent: 0,
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                    />
                  </label>
                  <p className="text-xs text-plooy-muted sm:col-span-2">
                    Yüzde veya sabit tutardan yalnızca birini girin. Örn: %20 → ₺69 plan ₺55,20 olur. %100 → ücretsiz.
                  </p>
                </div>
              )}

              <div className={`grid gap-4 sm:grid-cols-2 ${giftDraft.kind === 'discount' ? 'hidden' : ''}`}>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-plooy-muted">Süre (ay)</span>
                  <input
                    type="number"
                    min={0}
                    max={36}
                    value={giftDraft.durationMonths}
                    onChange={(event) =>
                      setGiftDraft((current) => ({
                        ...current,
                        durationMonths: Math.max(0, Number(event.target.value) || 0),
                        durationYears: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm text-plooy-muted">Süre (yıl)</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={giftDraft.durationYears}
                    onChange={(event) =>
                      setGiftDraft((current) => ({
                        ...current,
                        durationYears: Math.max(0, Number(event.target.value) || 0),
                        durationMonths: 0,
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm text-plooy-muted">Kullanım limiti</span>
                <input
                  type="number"
                  min={1}
                  value={giftDraft.maxUses}
                  onChange={(event) =>
                    setGiftDraft((current) => ({
                      ...current,
                      maxUses: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm text-plooy-muted">Kod son kullanma (isteğe bağlı)</span>
                <input
                  type="date"
                  value={giftDraft.expiresAt}
                  onChange={(event) => setGiftDraft((current) => ({ ...current, expiresAt: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white outline-none focus:border-plooy-gold"
                />
              </label>

              <button
                type="button"
                disabled={giftSaving}
                onClick={() => void handleCreateGiftCode()}
                className="w-full rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
              >
                {giftSaving ? 'Oluşturuluyor...' : giftDraft.kind === 'discount' ? 'İndirim kodu oluştur' : 'Hediye kodu oluştur'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#11141c] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Mevcut kodlar ({visibleGiftCodes.length})</h2>
              <div className="flex gap-2">
                {(
                  [
                    ['all', 'Tümü'],
                    ['gift', 'Hediye'],
                    ['discount', 'İndirim'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGiftFilter(id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      giftFilter === id ? 'bg-plooy-gold/15 text-plooy-gold' : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {visibleGiftCodes.length === 0 && (
                <p className="text-sm text-plooy-muted">Henüz kod yok.</p>
              )}
              {visibleGiftCodes.map((code) => {
                const exhausted = code.usedCount >= code.maxUses
                const expired = Boolean(code.expiresAt && new Date(code.expiresAt) < new Date())
                return (
                <div
                  key={code.id}
                  className="rounded-xl border border-white/10 bg-[#0d0f14] px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-white">{code.code}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            code.kind === 'discount' ? 'bg-sky-500/15 text-sky-200' : 'bg-emerald-500/15 text-emerald-200'
                          }`}
                        >
                          {code.kind === 'discount' ? 'İndirim' : 'Hediye'}
                        </span>
                        {(exhausted || expired) && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                            {expired ? 'Süresi doldu' : 'Limit doldu'}
                          </span>
                        )}
                      </div>
                      {code.label && <p className="mt-1 text-xs text-plooy-muted">{code.label}</p>}
                      <p className="mt-2 text-xs text-white/70">
                        {giftCodeSummary(code, planNameOf)} · {code.usedCount}/{code.maxUses} kullanım
                        {code.expiresAt
                          ? ` · kod bitiş: ${new Date(code.expiresAt).toLocaleDateString('tr-TR')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void navigator.clipboard.writeText(code.code)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                      >
                        Kopyala
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleRedemptions(code)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white"
                      >
                        {redemptionsFor === code.id ? 'Kullananları gizle' : `Kullananlar (${code.usedCount})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleGiftCode(code)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          code.enabled
                            ? 'border border-emerald-500/30 text-emerald-200'
                            : 'border border-white/15 text-white/50'
                        }`}
                      >
                        {code.enabled ? 'Aktif' : 'Kapalı'}
                      </button>
                      {code.usedCount === 0 && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteGiftCode(code)}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                  {redemptionsFor === code.id && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      {redemptionsLoading ? (
                        <p className="text-xs text-plooy-muted">Yükleniyor...</p>
                      ) : redemptions.length === 0 ? (
                        <p className="text-xs text-plooy-muted">Bu kodu henüz kimse kullanmadı.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs">
                          {redemptions.map((entry) => (
                            <li key={entry.id} className="flex flex-wrap justify-between gap-2 text-white/80">
                              <span>
                                {entry.userName}
                                {entry.userEmail ? ` · ${entry.userEmail}` : ''}
                              </span>
                              <span className="text-plooy-muted">
                                {new Date(entry.redeemedAt).toLocaleString('tr-TR')}
                                {entry.subscriptionExpiresAt
                                  ? ` · üyelik bitiş ${new Date(entry.subscriptionExpiresAt).toLocaleDateString('tr-TR')}`
                                  : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
