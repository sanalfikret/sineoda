import { dbGet, dbRun } from '../db.js'
import {
  DEFAULT_BILLING_PLANS,
  type BillingPlanDefinition,
} from './billingPlanDefaults.js'

const SETTINGS_KEY = 'billing_plans'
const CUSTOM_PLANS_KEY = 'billing_custom_plans'

const PLAN_ALIASES: Record<string, string> = {
  monthly: 'standard',
  yearly: 'standard',
}

export type BillingPlanOverrides = Partial<
  Pick<
    BillingPlanDefinition,
    | 'name'
    | 'price'
    | 'features'
    | 'popular'
    | 'enabled'
    | 'interval'
    | 'audience'
    | 'requiresStudentId'
    | 'campaignLabel'
    | 'sectionLabel'
  >
>

export type BillingPlansConfig = Partial<Record<string, BillingPlanOverrides>>

export type CustomBillingPlanInput = {
  id?: string
  name: string
  price: number
  interval: BillingPlanDefinition['interval']
  audience: BillingPlanDefinition['audience']
  features: string[]
  popular?: boolean
  requiresStudentId?: boolean
  enabled?: boolean
  campaignLabel?: string
  sectionLabel?: string
}

function parseConfig(raw: string | undefined): BillingPlansConfig {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as BillingPlansConfig
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseCustomPlans(raw: string | undefined): BillingPlanDefinition[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => sanitizeCustomPlan(entry))
      .filter((plan): plan is BillingPlanDefinition => Boolean(plan))
  } catch {
    return []
  }
}

function sanitizeInterval(value: unknown): BillingPlanDefinition['interval'] | null {
  if (value === 'month' || value === 'year' || value === 'once') return value
  return null
}

function sanitizeAudience(value: unknown): BillingPlanDefinition['audience'] | null {
  if (value === 'viewer' || value === 'creator') return value
  return null
}

function sanitizePlanId(value: unknown) {
  const id = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return id || null
}

function sanitizeFeatures(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((feature) => String(feature ?? '').trim())
    .filter(Boolean)
    .slice(0, 12)
}

function sanitizeOverrides(planId: string, raw: unknown): BillingPlanOverrides | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as BillingPlanOverrides
  const base = getBasePlan(planId)
  if (!base) return null

  const next: BillingPlanOverrides = {}

  if (typeof input.name === 'string') {
    const name = input.name.trim()
    if (name) next.name = name.slice(0, 120)
  }

  if (typeof input.price === 'number' && Number.isFinite(input.price)) {
    next.price = Math.max(0, Math.round(input.price))
  }

  if (Array.isArray(input.features)) {
    const features = sanitizeFeatures(input.features)
    if (features.length) next.features = features
  }

  if (typeof input.popular === 'boolean') {
    next.popular = input.popular
  }

  if (typeof input.enabled === 'boolean') {
    next.enabled = input.enabled
  }

  const interval = sanitizeInterval(input.interval)
  if (interval) next.interval = interval

  const audience = sanitizeAudience(input.audience)
  if (audience && isCustomPlanId(planId)) {
    next.audience = audience
  }

  if (typeof input.requiresStudentId === 'boolean') {
    next.requiresStudentId = input.requiresStudentId
  }

  if (typeof input.campaignLabel === 'string') {
    const label = input.campaignLabel.trim()
    next.campaignLabel = label ? label.slice(0, 80) : undefined
  }

  if (typeof input.sectionLabel === 'string') {
    const label = input.sectionLabel.trim()
    next.sectionLabel = label ? label.slice(0, 80) : undefined
  }

  return Object.keys(next).length > 0 ? next : null
}

export function sanitizeCustomPlan(raw: unknown): BillingPlanDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const input = raw as CustomBillingPlanInput
  const id = sanitizePlanId(input.id ?? `campaign-${Date.now()}`)
  if (!id) return null
  if (DEFAULT_BILLING_PLANS.some((plan) => plan.id === id)) return null

  const name = String(input.name ?? '').trim()
  const interval = sanitizeInterval(input.interval)
  const audience = sanitizeAudience(input.audience)
  if (!name || !interval || !audience) return null

  const features = sanitizeFeatures(input.features)
  if (!features.length) return null

  return {
    id,
    name: name.slice(0, 120),
    price: Math.max(0, Math.round(Number(input.price) || 0)),
    currency: 'TRY',
    interval,
    audience,
    features,
    popular: Boolean(input.popular),
    requiresStudentId: Boolean(input.requiresStudentId),
    enabled: input.enabled !== false,
    campaignLabel: String(input.campaignLabel ?? '').trim().slice(0, 80) || undefined,
    sectionLabel: String(input.sectionLabel ?? '').trim().slice(0, 80) || undefined,
  }
}

function isCustomPlanId(planId: string) {
  return !DEFAULT_BILLING_PLANS.some((plan) => plan.id === planId)
}

function getBasePlan(planId: string) {
  const custom = parseCustomPlans(
    dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [CUSTOM_PLANS_KEY])?.value,
  )
  return DEFAULT_BILLING_PLANS.find((plan) => plan.id === planId) ?? custom.find((plan) => plan.id === planId)
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
    requiresStudentId: overrides.requiresStudentId ?? base.requiresStudentId,
    popular: overrides.popular ?? base.popular,
    campaignLabel: overrides.campaignLabel ?? base.campaignLabel,
    sectionLabel: overrides.sectionLabel ?? base.sectionLabel,
  }
}

export function getBillingPlansConfig(): BillingPlansConfig {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [SETTINGS_KEY])
  return parseConfig(row?.value)
}

export function getCustomBillingPlans(): BillingPlanDefinition[] {
  const row = dbGet<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', [CUSTOM_PLANS_KEY])
  return parseCustomPlans(row?.value)
}

export function getBillingPlans(options?: { includeDisabled?: boolean; audience?: 'viewer' | 'creator' }) {
  const overrides = getBillingPlansConfig()
  const defaults = DEFAULT_BILLING_PLANS.map((base) => mergeBillingPlan(base, overrides[base.id]))
  const custom = getCustomBillingPlans().map((base) => mergeBillingPlan(base, overrides[base.id]))
  let plans = [...defaults, ...custom]
  if (options?.audience) {
    plans = plans.filter((plan) => plan.audience === options.audience)
  }
  if (!options?.includeDisabled) {
    plans = plans.filter((plan) => plan.enabled !== false)
  }
  return plans
}

export function getBillingPlan(planId: string) {
  return getBillingPlans({ includeDisabled: true }).find((plan) => plan.id === planId)
}

export function normalizeBillingPlanId(planId: string) {
  const normalized = PLAN_ALIASES[planId] ?? planId
  return getBillingPlan(normalized) ? normalized : null
}

export function saveBillingPlansConfig(input: BillingPlansConfig) {
  const current = getBillingPlansConfig()
  const next: BillingPlansConfig = { ...current }

  for (const base of [...DEFAULT_BILLING_PLANS, ...getCustomBillingPlans()]) {
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

export function saveCustomBillingPlans(input: CustomBillingPlanInput[]) {
  const sanitized = input
    .map((entry) => sanitizeCustomPlan(entry))
    .filter((plan): plan is BillingPlanDefinition => Boolean(plan))

  const ids = new Set<string>()
  for (const plan of sanitized) {
    if (ids.has(plan.id)) {
      throw new Error(`Yinelenen plan kimliği: ${plan.id}`)
    }
    ids.add(plan.id)
  }

  dbRun('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)', [
    CUSTOM_PLANS_KEY,
    JSON.stringify(sanitized),
  ])

  return getBillingPlans({ includeDisabled: true })
}
