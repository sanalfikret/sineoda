export const BILLING_PLANS = [
  {
    id: 'monthly',
    name: 'Aylık Plan',
    price: 149,
    currency: 'TRY',
    interval: 'month' as const,
    features: ['Tüm içerikler', '4 profil', 'HD yayın', 'Android TV desteği'],
  },
  {
    id: 'yearly',
    name: 'Yıllık Plan',
    price: 1290,
    currency: 'TRY',
    interval: 'year' as const,
    popular: true,
    features: ['Tüm içerikler', '4 profil', 'Full HD yayın', '2 ay bedava', 'Öncelikli destek'],
  },
]

export function getPlan(planId: string) {
  return BILLING_PLANS.find((plan) => plan.id === planId)
}

export function planExpiry(planId: string) {
  const plan = getPlan(planId)
  const expires = new Date()
  if (plan?.interval === 'year') expires.setFullYear(expires.getFullYear() + 1)
  else expires.setMonth(expires.getMonth() + 1)
  return expires.toISOString()
}
