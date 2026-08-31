import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BRAND_NAME } from '../../constants/brand'
import { useLocale } from '../../i18n/LocaleContext'

const hubsConfig = [
  {
    key: 'films' as const,
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=900&h=1200&fit=crop&q=80',
    accent: 'from-purple-900/90',
  },
  {
    key: 'series' as const,
    image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=900&h=1200&fit=crop&q=80',
    accent: 'from-blue-900/90',
  },
  {
    key: 'originals' as const,
    image: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=900&h=1200&fit=crop&q=80',
    accent: 'from-amber-900/90',
  },
]

export function LandingHubs() {
  const { t } = useTranslation('landing')
  const { localizePath } = useLocale()

  return (
    <section className="relative bg-plooy-bg px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('hubs.title')}</h2>
        <p className="mt-3 max-w-2xl text-base text-white/55">{t('hubs.subtitle')}</p>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {hubsConfig.map((hub) => (
            <Link
              key={hub.key}
              to={localizePath('/kayit')}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl sm:aspect-[4/5]"
            >
              <img
                src={hub.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${hub.accent} via-black/50 to-black/20`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <h3 className="text-2xl font-bold sm:text-3xl">
                  {hub.key === 'originals'
                    ? t('hubs.originals', { brand: BRAND_NAME })
                    : t(`hubs.${hub.key}`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{t(`hubs.${hub.key}Text`)}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-plooy-gold opacity-0 transition group-hover:opacity-100">
                  {t('hubs.explore')}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
