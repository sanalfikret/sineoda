import { Link } from 'react-router-dom'

export function PaymentSuccessPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg px-4">
      <div className="max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Ödeme başarılı</h1>
        <p className="mt-2 text-sm text-emerald-100">
          Aboneliğin aktif edildi. Hemen izlemeye başlayabilirsin.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-sineoda-gold px-6 py-3 text-sm font-semibold text-sineoda-bg"
        >
          İzlemeye Başla
        </Link>
      </div>
    </div>
  )
}
