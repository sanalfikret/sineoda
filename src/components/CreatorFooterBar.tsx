import { Link } from 'react-router-dom'

export function CreatorFooterBar() {
  return (
    <section className="border-t border-sineoda-gold/20 bg-gradient-to-r from-[#141820] via-[#1a1520] to-[#141820] px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-start gap-3 sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sineoda-gold/15 text-xl text-sineoda-gold">
            🎬
          </div>
          <div>
            <p className="text-base font-semibold text-white">Bağımsız yapımcı mısınız?</p>
            <p className="mt-0.5 max-w-xl text-sm text-sineoda-muted">
              Filminizi yükleyin, telif belgenizi sunun, nitelikli izlenmelerden gelir kazanın.
              Uzun metrajda en az %30 izlenme şartı geçerlidir.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-center gap-3">
          <Link
            to="/creator/kayit"
            className="rounded-lg bg-sineoda-gold px-5 py-2.5 text-sm font-semibold text-sineoda-bg transition hover:bg-sineoda-gold/90"
          >
            Yapımcı Ol
          </Link>
          <Link
            to="/creator/giris"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition hover:border-sineoda-gold/40 hover:text-sineoda-gold"
          >
            Yapımcı Girişi
          </Link>
        </div>
      </div>
    </section>
  )
}
