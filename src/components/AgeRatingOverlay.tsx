import { useEffect, useState } from 'react'
import { formatRatingBadge, getRatingDescription, parseContentRatingAge } from '../utils/contentRating'

interface AgeRatingOverlayProps {
  rating: string
  /** Yeni içerik/bölüm başladığında değişir — overlay yeniden gösterilir */
  playbackKey: string
  visibleMs?: number
}

export function AgeRatingOverlay({ rating, playbackKey, visibleMs = 5000 }: AgeRatingOverlayProps) {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    setVisible(true)
    setFading(false)

    const fadeTimer = window.setTimeout(() => setFading(true), visibleMs - 600)
    const hideTimer = window.setTimeout(() => setVisible(false), visibleMs)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [playbackKey, visibleMs])

  if (!visible) return null

  const badge = formatRatingBadge(rating)
  const age = parseContentRatingAge(rating)
  const isGeneral = age === 0

  return (
    <div
      className={`pointer-events-none absolute left-4 top-[4.5rem] z-30 sm:left-6 sm:top-20 ${
        fading ? 'opacity-0 transition-opacity duration-500' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label={`Yaş sınırı: ${badge}`}
    >
      <div
        className={`rounded-xl border-2 px-4 py-3 shadow-2xl backdrop-blur-md ${
          isGeneral
            ? 'border-emerald-400/60 bg-emerald-950/75 text-emerald-100'
            : age >= 18
              ? 'border-red-400/70 bg-red-950/80 text-red-50'
              : age >= 16
                ? 'border-orange-400/70 bg-orange-950/80 text-orange-50'
                : 'border-amber-400/70 bg-amber-950/80 text-amber-50'
        }`}
      >
        <p className="text-3xl font-black leading-none tracking-tight sm:text-4xl">{badge}</p>
        <p className="mt-1.5 max-w-[11rem] text-[11px] font-medium leading-snug opacity-90 sm:text-xs">
          {getRatingDescription(rating)}
        </p>
      </div>
    </div>
  )
}
