import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBillingPlans, resolveMediaUrl, type BillingPlan } from '../../api/client'
import type { LandingCampaignSection } from '../../constants/landingDefaults'
import { useLocale } from '../../i18n/LocaleContext'

function intervalLabel(interval: BillingPlan['interval'], locale: string) {
  if (interval === 'year') return locale === 'en' ? '/yr' : '/yıl'
  if (interval === 'once') return ''
  return locale === 'en' ? '/mo' : '/ay'
}

export function LandingPricing({ section }: { section: LandingCampaignSection }) {
  const { localizePath, locale } = useLocale()
  const [plans, setPlans] = useState<BillingPlan[]>([])

  useEffect(() => {
    void fetchBillingPlans()
      .then(({ plans: all }) => setPlans(all.filter((plan) => plan.enabled !== false && plan.audience !== 'creator')))
      .catch(() => setPlans([]))
  }, [])

  // Fiyat metinleri admin planlarından canlı gelir; admin fiyatı değiştirince burada da değişir.
  const live = useMemo(() => {
    if (plans.length === 0) return null
    const monthly = plans.filter((plan) => plan.interval === 'month')
    const cheapest = [...(monthly.length ? monthly : plans)].sort((a, b) => a.price - b.price)[0]
    return {
      price: `₺${cheapest.price}`,
      suffix: locale === 'en' ? `from ${intervalLabel(cheapest.interval, locale)}` : `'ten başlayan ${intervalLabel(cheapest.interval, locale)}`,
      note: plans.map((plan) => `${plan.name} ₺${plan.price}${intervalLabel(plan.interval, locale)}`).join(' · '),
    }
  }, [plans, locale])

  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#141824] via-[#10131c] to-black">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-plooy-gold">{section.eyebrow}</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">{section.title}</h2>
              <p className="mt-4 text-base text-white/55">{section.description}</p>

              <div className="mt-8 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">{live?.price ?? section.price}</span>
                  <span className="text-white/50">{live?.suffix ?? section.priceSuffix}</span>
                </div>
                <p className="text-sm text-white/45">{live?.note ?? section.priceNote}</p>
              </div>

              <Link
                to={localizePath(section.ctaPrimaryLink || '/kayit')}
                className="mt-8 inline-flex rounded-md bg-white px-8 py-3.5 text-sm font-bold text-black transition hover:bg-white/90"
              >
                {section.ctaPrimary}
              </Link>
              <Link
                to={localizePath(section.ctaSecondaryLink || '/planlar')}
                className="ml-4 inline-flex text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
              >
                {section.ctaSecondary}
              </Link>
            </div>

            <div className="relative hidden min-h-[320px] lg:block">
              <img
                key={section.image}
                src={resolveMediaUrl(section.image)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#10131c] to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
