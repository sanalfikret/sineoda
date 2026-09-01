import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function BootSpinner() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#090a0e',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '2px solid #c9a962',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'plooy-boot-spin 0.8s linear infinite',
        }}
      />
    </div>
  )
}

function BootError() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#090a0e',
        color: '#e8eaef',
        fontFamily: 'system-ui,sans-serif',
        textAlign: 'center',
      }}
    >
      <div>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Sayfa yüklenemedi</p>
        <p style={{ margin: '0 0 16px', color: '#9aa3b5', fontSize: 14 }}>
          Bağlantı veya önbellek sorunu olabilir. Ctrl+Shift+R ile yenileyin.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          style={{
            cursor: 'pointer',
            border: 0,
            borderRadius: 8,
            padding: '10px 18px',
            background: '#c9a962',
            color: '#090a0e',
            fontWeight: 700,
          }}
        >
          Yeniden dene
        </button>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root bulunamadı')
}

const root = createRoot(container)
root.render(
  <StrictMode>
    <BootSpinner />
  </StrictMode>,
)

void (async () => {
  try {
    await import('./i18n')
    const { default: AppRoot } = await import('./AppRoot')
    root.render(<AppRoot />)
    try {
      const { registerSW } = await import('virtual:pwa-register')
      registerSW({ immediate: false, onNeedRefresh() {} })
    } catch {
      /* PWA opsiyonel */
    }
  } catch (error) {
    console.error('[plooy] boot failed', error)
    container.setAttribute('data-plooy-boot', 'error')
    root.render(
      <StrictMode>
        <BootError />
      </StrictMode>,
    )
  }
})()
