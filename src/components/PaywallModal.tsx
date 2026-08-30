import { Link } from 'react-router-dom'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
}

export function PaywallModal({ open, onClose }: PaywallModalProps) {
  if (!open) return null

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-sineoda-gold/30 bg-sineoda-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sineoda-gold">Abonelik gerekli</p>
        <h2 className="mt-2 text-2xl font-bold text-white">İzlemeye devam et</h2>
        <p className="mt-3 text-sm leading-relaxed text-sineoda-muted">
          Bu içeriği izlemek için aktif bir Plooy aboneliğine ihtiyacın var. Öğrenci (₺49/ay) veya
          standart (₺69/ay) plan seçip ödeme yapmalısın.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/planlar"
            onClick={onClose}
            className="rounded-lg bg-sineoda-gold py-3 text-center text-sm font-semibold text-sineoda-bg"
          >
            Planları Gör
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 py-3 text-sm text-white/80 hover:bg-white/5"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
