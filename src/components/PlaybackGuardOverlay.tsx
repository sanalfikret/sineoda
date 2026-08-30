import { useEffect, useRef } from 'react'
import { isTvDevice } from '../utils/tvDevice'

interface PlaybackGuardOverlayProps {
  mode: 'idle_prompt' | 'other_device' | 'daily_limit'
  message?: string
  onContinue: () => void
  onClose: () => void
}

export function PlaybackGuardOverlay({ mode, message, onContinue, onClose }: PlaybackGuardOverlayProps) {
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isTvDevice()) primaryRef.current?.focus()
  }, [mode])

  const title =
    mode === 'idle_prompt'
      ? 'Hâlâ orada mısın?'
      : mode === 'daily_limit'
        ? 'Bugünlük hakkın doldu'
        : 'Başka cihazda izleniyor'

  const body =
    message ??
    (mode === 'idle_prompt'
      ? 'Bir süredir hareket yok — içeriği durdurduk. Devam etmek ister misin?'
      : mode === 'daily_limit'
        ? 'Biraz dinlen; İstanbul saatiyle yarın yeni izleme hakkın açılacak.'
        : 'Hesabın şu an başka bir cihazda izleniyor. Aynı anda yalnızca bir cihazdan devam edebilirsin.')

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-plooy-surface/95 p-6 text-center shadow-2xl tv:max-w-xl tv:p-8">
        <p className="text-lg font-semibold text-white tv:text-2xl">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-plooy-muted tv:text-lg">{body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {mode === 'idle_prompt' ? (
            <button
              ref={primaryRef}
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-plooy-gold px-5 py-3 text-sm font-semibold text-plooy-bg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold tv:px-8 tv:py-4 tv:text-lg"
            >
              Evet, devam et
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plooy-gold tv:px-8 tv:py-4 tv:text-lg"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export type PlaybackGuardMode = PlaybackGuardOverlayProps['mode']
