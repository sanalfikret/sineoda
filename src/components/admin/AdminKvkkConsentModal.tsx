import { Link } from 'react-router-dom'

interface AdminKvkkConsentModalProps {
  userName: string
  userEmail: string
  acceptedAt: string
  ipAddress: string
  consentText: string
  onClose: () => void
}

export function AdminKvkkConsentModal({
  userName,
  userEmail,
  acceptedAt,
  ipAddress,
  consentText,
  onClose,
}: AdminKvkkConsentModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#11141c] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">KVKK / Açık Rıza Onayı</h2>
            <p className="mt-1 text-sm text-plooy-muted">{userName} · {userEmail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-plooy-muted">Onay tarihi</dt>
              <dd className="mt-0.5 font-medium text-white">
                {new Date(acceptedAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
              </dd>
            </div>
            <div>
              <dt className="text-plooy-muted">IP adresi</dt>
              <dd className="mt-0.5 font-medium text-white">{ipAddress}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-plooy-muted">Kayıtlı onay metni</p>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0d0f14] p-4 text-xs leading-relaxed text-white/80">
              {consentText}
            </pre>
          </div>

          <p className="text-xs text-plooy-muted">
            Metnin tamamını görmek için{' '}
            <Link to="/yasal/kvkk-aydinlatma" target="_blank" className="text-plooy-gold hover:underline">
              KVKK Aydınlatma Metni
            </Link>
            {' '}ve{' '}
            <Link to="/yasal/acik-riza-metni" target="_blank" className="text-plooy-gold hover:underline">
              Açık Rıza Metni
            </Link>
            sayfalarına bakabilirsiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
