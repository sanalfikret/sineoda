import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageFooter } from '../components/PageFooter'

export function PaymentSuccessPage() {
  const { refreshUser, user } = useAuth()
  const [searchParams] = useSearchParams()
  const isCreatorReturn = searchParams.get('return') === 'creator' || user?.role === 'creator'

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Ödeme başarılı</h1>
        <p className="mt-2 text-sm text-emerald-100">
          {isCreatorReturn
            ? 'Yapımcı başvuru ücretiniz alındı. Artık film başvurusu gönderebilirsiniz; filminizin yayına alınması admin incelemesine tabidir.'
            : 'Aboneliğin aktif edildi. Profilini seçip hemen izlemeye başlayabilirsin.'}
        </p>
        <Link
          to={isCreatorReturn ? '/creator' : '/profiller'}
          className="mt-6 inline-block rounded-lg bg-plooy-gold px-6 py-3 text-sm font-semibold text-plooy-bg"
        >
          {isCreatorReturn ? 'Yapımcı Paneline Git' : 'Profil Seç ve İzle'}
        </Link>
      </div>
      </div>
      <PageFooter />
    </div>
  )
}
