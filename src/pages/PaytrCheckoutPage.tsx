import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PlooyLogo } from '../components/PlooyLogo'

export function PaytrCheckoutPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  useEffect(() => {
    if (!token) return
    const script = document.createElement('script')
    script.src = 'https://www.paytr.com/js/iframeResizer.min.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [token])

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-sineoda-bg px-4 text-center text-white">
        <div>
          <p>Ödeme oturumu bulunamadı.</p>
          <Link to="/planlar" className="mt-4 inline-block text-sineoda-gold hover:underline">
            Planlara dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-sineoda-bg">
      <header className="safe-top border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <PlooyLogo tone="on-dark" className="h-6" />
            <span className="text-sm text-sineoda-muted">· PayTR</span>
          </div>
          <Link to="/planlar" className="text-sm text-sineoda-muted hover:text-white">
            İptal
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <iframe
          src={`https://www.paytr.com/odeme/guvenli/${token}`}
          id="paytriframe"
          title="PayTR Ödeme"
          className="h-[720px] w-full rounded-2xl border border-white/10 bg-white"
        />
      </main>
    </div>
  )
}
