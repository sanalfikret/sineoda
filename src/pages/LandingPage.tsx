import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter } from '../components/SiteFooter'
import { fetchBootstrap, resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'

const hubs = [
  {
    title: 'Filmler',
    text: 'Ödüllü yapımlar ve seçkin sinema.',
    gradient: 'from-violet-600/80 via-fuchsia-700/60 to-sineoda-bg',
    icon: '🎬',
  },
  {
    title: 'Diziler',
    text: 'Sezon sezon sürükleyici hikayeler.',
    gradient: 'from-blue-600/80 via-indigo-700/60 to-sineoda-bg',
    icon: '📺',
  },
  {
    title: 'Özel İçerik',
    text: 'Sadece Sineoda\'da izleyebileceğin yapımlar.',
    gradient: 'from-amber-500/80 via-orange-700/60 to-sineoda-bg',
    icon: '✨',
  },
]

const highlights = [
  {
    title: 'Her ekranda',
    text: 'Telefon, tablet, bilgisayar ve Android TV. Tek hesap, tüm cihazlar.',
  },
  {
    title: 'Kişisel profiller',
    text: 'Aile üyeleri için ayrı profiller ve çocuk modu.',
  },
  {
    title: 'Kaldığın yerden',
    text: 'İzlemeye kaldığın yerden devam et, listene ekle.',
  },
  {
    title: 'Premium deneyim',
    text: 'Sinematik arayüz, fragmanlar ve kesintisiz oynatma.',
  },
]

const plans = [
  { name: 'Aylık', price: '₺149', period: '/ay', highlight: false },
  { name: 'Yıllık', price: '₺1.290', period: '/yıl', highlight: true, badge: '2 ay bedava' },
]

export function LandingPage() {
  const [heroItem, setHeroItem] = useState<ContentItem | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    fetchBootstrap()
      .then((data) => setHeroItem(data.featuredContent ?? data.catalog[0] ?? null))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const heroImage = heroItem
    ? resolveMediaUrl(heroItem.backdrop || heroItem.poster)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&h=1080&fit=crop&q=80'

  return (
    <div className="min-h-dvh bg-sineoda-bg text-white">
      <header
        className={`safe-top fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
          scrolled ? 'bg-sineoda-bg/95 backdrop-blur-md shadow-lg shadow-black/20' : 'bg-gradient-to-b from-black/90 via-black/40 to-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-9 w-9 rounded-lg" />
            <span className="text-2xl font-bold tracking-tight">
              Sine<span className="text-sineoda-gold">oda</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/planlar" className="hidden text-sm font-medium text-white/80 transition hover:text-white sm:inline-flex">
              Planlar
            </Link>
            <Link
              to="/giris"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Giriş Yap
            </Link>
            <Link
              to="/kayit"
              className="rounded-md bg-sineoda-gold px-4 py-2 text-sm font-semibold text-sineoda-bg transition hover:brightness-110 sm:px-5"
            >
              Üye Ol
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[92dvh] overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-sineoda-bg via-sineoda-bg/80 to-sineoda-bg/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-sineoda-bg via-sineoda-bg/30 to-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(232,184,74,0.12),transparent_50%)]" />

        <div className="relative mx-auto flex min-h-[92dvh] max-w-7xl flex-col justify-end px-4 pb-20 pt-32 sm:px-6 sm:pb-28">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sineoda-gold sm:text-sm">
            Premium yayın platformu
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
            Hikayeler burada başlar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            {heroItem
              ? `${heroItem.title} ve daha fazlası — üye olduktan sonra tüm katalog seninle.`
              : 'Filmler, diziler ve özel yapımlar. Üye ol, keşfetmeye başla.'}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/kayit"
              className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3.5 text-sm font-bold text-black transition hover:bg-white/90 sm:text-base"
            >
              Üyeliğe Başla
            </Link>
            <Link
              to="/planlar"
              className="inline-flex items-center justify-center rounded-md border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 sm:text-base"
            >
              Planları Gör
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/50 sm:text-sm">
            İçerik kataloğu giriş yaptıktan sonra açılır.
          </p>
        </div>
      </section>

      <section className="border-y border-white/5 bg-black/40 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">
            Keşfet
          </p>
          <h2 className="mt-3 text-center text-3xl font-bold sm:text-4xl">
            Her zevke uygun bir dünya
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {hubs.map((hub) => (
              <Link
                key={hub.title}
                to="/kayit"
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${hub.gradient} p-8 transition hover:scale-[1.02] hover:border-white/20`}
              >
                <span className="text-4xl" aria-hidden="true">
                  {hub.icon}
                </span>
                <h3 className="mt-6 text-2xl font-bold">{hub.title}</h3>
                <p className="mt-2 text-sm text-white/75">{hub.text}</p>
                <span className="mt-6 inline-flex text-sm font-semibold text-sineoda-gold group-hover:underline">
                  Üye ol ve keşfet →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">
                Neden Sineoda?
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                Sinema kalitesinde dijital deneyim
              </h2>
              <p className="mt-4 text-base leading-relaxed text-sineoda-muted">
                Netflix&apos;in akıcı arayüzü, Disney+&apos;in marka dünyaları ve HBO Max&apos;in
                sinematik sunumu bir arada. Katalog ve kategoriler yalnızca üyelere özel.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-sineoda-surface/80 p-5"
                >
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-sineoda-muted">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-sineoda-surface/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">İzlemeye hazır mısın?</h2>
          <p className="mt-3 text-sineoda-muted">
            Üye ol, profilini seç ve kişiselleştirilmiş ana sayfana geç.
          </p>
          <Link
            to="/kayit"
            className="mt-8 inline-flex rounded-md bg-sineoda-gold px-10 py-4 text-base font-bold text-sineoda-bg shadow-lg shadow-sineoda-gold/20 transition hover:brightness-110"
          >
            Hemen Başla
          </Link>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sineoda-gold">
              Abonelik
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Sana uygun planı seç</h2>
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
                <p className="mt-2 text-4xl font-bold">
                  {plan.price}
                  <span className="text-base font-normal text-sineoda-muted">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  <li>• Tüm katalog ve kategoriler</li>
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
              className="inline-flex rounded-lg bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/15"
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
