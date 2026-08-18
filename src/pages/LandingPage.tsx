import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { fetchBootstrap, resolveMediaUrl } from '../api/client'
import { TrailerBackdrop } from '../components/TrailerBackdrop'
import type { ContentItem } from '../types/content'

const features = [
  {
    title: 'Her cihazda',
    text: 'Telefon, tablet, bilgisayar, Android TV ve tarayıcı — tek hesap, tüm platformlar.',
    icon: '📺',
  },
  {
    title: 'Premium katalog',
    text: 'Filmler ve diziler; lisanslı stream sağlayıcılarından güvenli bağlantı ile yayınlanır.',
    icon: '🎬',
  },
  {
    title: 'Kesintisiz izleme',
    text: 'Kaldığın yerden devam, listem, profiller ve kişiselleştirilmiş öneriler.',
    icon: '✨',
  },
]

const plans = [
  { name: 'Aylık', price: '₺149', period: '/ay', highlight: false },
  { name: 'Yıllık', price: '₺1.290', period: '/yıl', highlight: true, badge: '2 ay bedava' },
]

export function LandingPage() {
  const [trailers, setTrailers] = useState<ContentItem[]>([])
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null)
  const [activeTrailer, setActiveTrailer] = useState(0)

  useEffect(() => {
    fetchBootstrap()
      .then((data) => {
        const items = data.trailers?.length ? data.trailers : data.catalog.slice(0, 6)
        setTrailers(items)
        setHeroItem(data.featuredContent ?? items[0] ?? null)
      })
      .catch(() => undefined)
  }, [])

  const currentTrailer = trailers[activeTrailer] ?? heroItem

  return (
    <div className="min-h-dvh bg-sineoda-bg">
      <header className="safe-top absolute inset-x-0 top-0 z-20 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-2xl font-bold text-white">
              Sine<span className="text-sineoda-gold">oda</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/planlar"
              className="hidden rounded-lg px-4 py-2 text-sm font-medium text-white/85 transition hover:text-white sm:inline-flex"
            >
              Planlar
            </Link>
            <Link
              to="/giris"
              className="rounded-lg border border-sineoda-gold/40 bg-sineoda-gold/10 px-4 py-2 text-sm font-semibold text-sineoda-gold transition hover:bg-sineoda-gold/20 sm:px-5 sm:py-2.5"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-dvh overflow-hidden">
        {currentTrailer ? (
          <TrailerBackdrop item={currentTrailer} />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop&q=80)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-sineoda-bg/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,184,74,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-sineoda-bg via-sineoda-bg/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-sineoda-bg via-transparent to-sineoda-bg/40" />

        <div className="relative flex min-h-dvh items-center px-4 sm:px-6">
          <div className="mx-auto w-full max-w-7xl pt-24">
            {currentTrailer && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sineoda-gold sm:text-sm">
                {currentTrailer.isNew ? 'Yeni · Fragman' : 'Fragman'}
              </p>
            )}
            {!currentTrailer && (
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sineoda-gold sm:text-sm">
                Premium sinema platformu
              </p>
            )}
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
              {currentTrailer ? currentTrailer.title : 'Sinemanın en seçkin hikayeleri, tek platformda.'}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 sm:text-xl">
              {currentTrailer
                ? currentTrailer.description
                : "Diziler, filmler ve özel yapımlar. Android, iOS, web ve Android TV'de — mağaza indirmesi olmadan PWA olarak kurulabilir."}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/kayit"
                className="inline-flex items-center justify-center rounded-lg bg-sineoda-gold px-7 py-4 text-sm font-semibold text-sineoda-bg shadow-lg shadow-sineoda-gold/25 transition hover:brightness-110 sm:text-base"
              >
                Üyeliğe Başla
              </Link>
              <Link
                to="/planlar"
                className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 sm:text-base"
              >
                Planları İncele
              </Link>
            </div>
          </div>
        </div>
      </section>

      {trailers.length > 1 && (
        <section className="border-b border-white/5 bg-sineoda-surface/30 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-sineoda-gold">
              Fragmanlar
            </h2>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {trailers.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTrailer(index)}
                  className={`relative shrink-0 overflow-hidden rounded-xl border transition ${
                    activeTrailer === index
                      ? 'border-sineoda-gold ring-2 ring-sineoda-gold/40'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <img
                    src={resolveMediaUrl(item.poster)}
                    alt={item.title}
                    className="h-28 w-20 object-cover sm:h-32 sm:w-24"
                  />
                  {item.isNew && (
                    <span className="absolute left-1 top-1 rounded bg-sineoda-gold px-1.5 py-0.5 text-[9px] font-bold text-sineoda-bg">
                      YENİ
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[10px] text-white truncate">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-y border-white/5 bg-sineoda-surface/50 px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-[#11141c] p-6"
            >
              <span className="text-3xl" aria-hidden="true">
                {feature.icon}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-sineoda-muted">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">
              Abonelik
            </p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Aylık veya yıllık, sana uygun plan
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlight
                    ? 'border-sineoda-gold/40 bg-gradient-to-b from-sineoda-gold/10 to-transparent'
                    : 'border-white/10 bg-[#11141c]'
                }`}
              >
                {plan.badge && (
                  <span className="absolute right-6 top-6 rounded-full bg-sineoda-gold px-3 py-1 text-xs font-semibold text-sineoda-bg">
                    {plan.badge}
                  </span>
                )}
                <p className="text-sm text-sineoda-muted">{plan.name}</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  {plan.price}
                  <span className="text-base font-normal text-sineoda-muted">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  <li>• Tüm filmler ve diziler</li>
                  <li>• HD / Full HD yayın</li>
                  <li>• 4 profil, çocuk profili</li>
                  <li>• Android TV ve mobil PWA</li>
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              to="/planlar"
              className="inline-flex rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Tüm plan detayları
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
