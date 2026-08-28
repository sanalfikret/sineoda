import { dbGet, dbRun } from '../db.js'
import {
  DEFAULT_BILLING_PLANS,
  type BillingPlanDefinition,
  type BillingPlanId,
} from './billingPlanDefaults.js'

const SETTINGS_KEY = 'billing_plans'

export type BillingPlanOverrides = Partial<
  Pick<BillingPlanDefinition, 'name' | 'price' | 'features' | 'popular' | 'enabled'>
>

export type BillingPlansConfig = Partial<Record<BillingPlanId, BillingPlanOverrides>>

function parseConfig(raw: string | undefined): BillingPlansConfig {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as BillingPlansConfig
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function sanitizeOverrides(
  planId: BillingPlanId,
  raw: unknown,
): BillingPlanOverrides | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as BillingPlanOverrides
  const base = DEFAULT_BILLING_PLANS.find((plan) => plan.id === planId)
  if (!base) return null

  const next: BillingPlanOverrides = {}

  if (typeof input.name === 'string') {
    const name = input.name.trim()
    if (name) next.name = name.slice(0, 120)
  }

  if (typeof input.price === 'number' && Number.isFinite(input.price)) {
    next.price = Math.max(1, Math.round(input.price))
  }

  if (Array.isArray(input.features)) {
    next.features = input.features
      .map((feature) => String(feature ?? '').trim())
      .filter(Boolean)
      .slice(0, 12)
  }

  if (planId === 'student' && typeof input.popular === 'boolean') {
    next.popular = input.popular
  }

  if (typeof input.enabled === 'boolean') {
    next.enabled = input.enabled
  }

  return Object.keys(next).length > 0 ? next : null
}

export function mergeBillingPlan(
  base: BillingPlanDefinition,
  overrides?: BillingPlanOverrides,
): BillingPlanDefinition {
  if (!overrides) return { ...base }
  return {
    ...base,
    ...overrides,
    features: overrides.features?.length ? overrides.features : base.features,
    enabled: overrides.enabled ?? base.enabled ?? true,
  }
}

export function getBillingPlansConfig(): BillingPlansConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  return parseConfig(row?.value)
}

export function getBillingPlans(options?: { includeDisabled?: boolean; audience?: 'viewer' | 'creator' }) {
  const overrides = getBillingPlansConfig()
  let plans = DEFAULT_BILLING_PLANS.map((base) => mergeBillingPlan(base, overrides[base.id]))
  if (options?.audience) {
    plans = plans.filter((plan) => plan.audience === options.audience)
  }
  if (!options?.includeDisabled) {
    plans = plans.filter((plan) => plan.enabled !== false)
  }
  return plans
}

export function getBillingPlan(planId: BillingPlanId) {
  return getBillingPlans({ includeDisabled: true }).find((plan) => plan.id === planId)
}

export function saveBillingPlansConfig(input: BillingPlansConfig) {
  const current = getBillingPlansConfig()
  const next: BillingPlansConfig = { ...current }

  for (const base of DEFAULT_BILLING_PLANS) {
    const patch = sanitizeOverrides(base.id, input[base.id])
    if (!patch) continue
    next[base.id] = { ...current[base.id], ...patch }
  }

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    SETTINGS_KEY,
    JSON.stringify(next),
  ])

  return getBillingPlans({ includeDisabled: true })
}
