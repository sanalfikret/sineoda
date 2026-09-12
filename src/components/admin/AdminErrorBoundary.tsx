import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Admin sayfalarında beklenmeyen bir çalışma zamanı hatası tüm paneli karartmasın:
 * hata mesajı, yenile düğmesi ve Özet'e dönüş gösterilir. Konsola da yazılır.
 */
export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] sayfa hatası:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-white">
        <h2 className="text-lg font-bold">Bu sayfada bir hata oluştu</h2>
        <p className="mt-2 text-sm text-red-200">{this.state.error.message}</p>
        <p className="mt-2 text-xs text-plooy-muted">Verileriniz etkilenmedi. Sayfayı yenileyin; sorun sürerse hata mesajını Plooy ekibine iletin.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-black">
            Sayfayı yenile
          </button>
          <a href="/admin" className="rounded-lg border border-white/20 px-4 py-2 text-sm">
            Özet'e dön
          </a>
        </div>
      </div>
    )
  }
}
