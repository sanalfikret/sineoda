const features = [
  {
    title: 'TV, bilgisayar, mobil',
    text: 'Tüm cihazlarında kesintisiz izle.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 21H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '4 profile kadar',
    text: 'Herkes için ayrı izleme deneyimi.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Kaldığın yerden',
    text: 'İzlemeye kaldığın noktadan devam et.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 6V4M12 20v-2M6 12H4M20 12h-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: 'Çocuk profili',
    text: 'Aile dostu içerikler güvenle.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l1.8 4.5L18 9l-4.2 1.5L12 15l-1.8-4.5L6 9l4.2-1.5L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function LandingFeatures() {
  return (
    <section className="border-y border-white/5 bg-[#0a0c12] px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sineoda-gold">Deneyim</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              İzlemek için
              <br />
              tasarlandı.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
              Sinematik arayüz, kişisel öneriler ve premium oynatıcı. Üye olduktan sonra tüm katalog
              ve kategoriler senin için açılır.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="text-sineoda-gold">{feature.icon}</div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
