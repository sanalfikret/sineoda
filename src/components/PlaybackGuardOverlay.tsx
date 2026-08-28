type PlaybackGuardMode = 'idle_prompt' | 'other_device' | 'daily_limit'

interface PlaybackGuardOverlayProps {
  mode: PlaybackGuardMode
  message?: string
  onContinue: () => void
  onClose: () => void
}

export function PlaybackGuardOverlay({ mode, message, onContinue, onClose }: PlaybackGuardOverlayProps) {
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
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-sineoda-surface/95 p-6 text-center shadow-2xl">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-sineoda-muted">{body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {mode === 'idle_prompt' ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-sineoda-gold px-5 py-3 text-sm font-semibold text-sineoda-bg transition hover:brightness-110"
            >
              Evet, devam et
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

export type { PlaybackGuardMode }
