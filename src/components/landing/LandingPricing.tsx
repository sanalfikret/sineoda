import { Link } from 'react-router-dom'

export function LandingPricing() {
  return (
    <section className="px-5 py-20 sm:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#141824] via-[#10131c] to-black">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-sineoda-gold">Abonelik</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">İzlemeye bugün başla</h2>
              <p className="mt-4 text-base text-white/55">
                Aylık veya yıllık plan. İstediğin zaman iptal et.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold">₺149</span>
                  <span className="text-white/50">/ay</span>
                </div>
                <p className="text-sm text-white/45">veya yıllık ₺1.290 — 2 ay bedava</p>
              </div>

              <Link
                to="/kayit"
                className="mt-8 inline-flex rounded-md bg-white px-8 py-3.5 text-sm font-bold text-black transition hover:bg-white/90"
              >
                Ücretsiz Dene
              </Link>
              <Link
                to="/planlar"
                className="ml-4 inline-flex text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
              >
                Planları karşılaştır
              </Link>
            </div>

            <div className="relative hidden min-h-[320px] lg:block">
              <img
                src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=800&fit=crop&q=80"
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
