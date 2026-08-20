import { Link } from 'react-router-dom'

export function LandingCreatorSection() {
  return (
    <section
      id="yapimcilar"
      className="relative overflow-hidden border-y border-sineoda-gold/20 bg-gradient-to-br from-[#151820] via-[#1a1525] to-[#121820] px-4 py-16 sm:px-6 sm:py-20"
    >
      <div
        className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-sineoda-gold/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sineoda-gold">
            Bağımsız sinema
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Filmini yükle, adil paylaşımdan kazanç elde et
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg">
            Yapımcı hesabı aç, telif belgeni yükle, filmini gönder. Bağımsız sinemanızı Sineoda
            izleyicileriyle buluşturun; gelir paylaşımı koşulları yapımcı anlaşmasında açıkça
            belirtilir.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/60 lg:text-left">
            <li>• Telif / mülkiyet belgesi zorunlu</li>
            <li>• Yasal sorumluluk yapımcıya aittir</li>
            <li>• İçerikler editöryal incelemeden geçer</li>
          </ul>
        </div>

        <div className="flex w-full max-w-sm shrink-0 flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
          <Link
            to="/creator/kayit"
            className="rounded-lg bg-sineoda-gold px-6 py-3.5 text-center text-sm font-bold text-sineoda-bg transition hover:brightness-110"
          >
            Yapımcı Üyeliği Oluştur
          </Link>
          <Link
            to="/creator/giris"
            className="rounded-lg border border-white/20 bg-white/5 px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:border-sineoda-gold/40 hover:bg-white/10"
          >
            Yapımcı Girişi
          </Link>
        </div>
      </div>
    </section>
  )
}
