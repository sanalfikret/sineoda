import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { useAdminLayout } from '../../utils/adminLayout'

interface ResizableSplitProps {
  layoutKey: string
  left: ReactNode
  right: ReactNode
  /** Sol bölümün varsayılan oranı (0.2–0.85) */
  defaultRatio?: number
  className?: string
}

const MIN = 0.3
const MAX = 0.8

/**
 * İki panel arasında fareyle çekilen dikey bölme çubuğu (ör. tablo | detay).
 * Oran admin için kalıcıdır; çift tıklama varsayılana döndürür. xl altı ekranlarda alt alta dizilir.
 */
export function ResizableSplit({ layoutKey, left, right, defaultRatio = 0.6, className = '' }: ResizableSplitProps) {
  const layout = useAdminLayout(layoutKey, { ids: [], split: defaultRatio })
  const [live, setLive] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement | null>(null)
  const ratio = Math.min(MAX, Math.max(MIN, live ?? layout.split))

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const box = ref.current
    if (!box) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* bazı tarayıcılarda sentetik olaylarda desteklenmez; window dinleyicileri yeterli */
    }
    const rect = box.getBoundingClientRect()
    let current = ratio
    const move = (e: globalThis.PointerEvent) => {
      current = Math.min(MAX, Math.max(MIN, (e.clientX - rect.left) / rect.width))
      setLive(current)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setLive(null)
      layout.setSplit(Math.round(current * 1000) / 1000)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 gap-6 xl:[grid-template-columns:var(--split)] xl:gap-0 ${className}`}
      style={{ '--split': `minmax(0, ${ratio}fr) 24px minmax(0, ${1 - ratio}fr)` } as CSSProperties}
    >
      <div className="min-w-0">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Tablo ve detay genişliğini ayarla"
        title="Çekerek genişliği ayarlayın · çift tıklama: varsayılan"
        onPointerDown={onPointerDown}
        onDoubleClick={() => layout.reset()}
        className="group hidden cursor-col-resize touch-none items-center justify-center xl:flex"
      >
        <span className={`h-16 w-1 rounded-full transition ${live !== null ? 'bg-plooy-gold' : 'bg-white/15 group-hover:bg-plooy-gold/70'}`} />
      </div>
      <div className="min-w-0">{right}</div>
    </div>
  )
}
