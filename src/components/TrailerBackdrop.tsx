import { useEffect, useRef } from 'react'
import { resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'

interface TrailerBackdropProps {
  item: ContentItem
}

export function TrailerBackdrop({ item }: TrailerBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trailer = item.trailerUrl ? resolveMediaUrl(item.trailerUrl) : ''

  useEffect(() => {
    const video = videoRef.current
    if (!video || !trailer) return
    video.muted = true
    void video.play().catch(() => undefined)
  }, [trailer])

  if (!trailer) {
    return (
      <img
        src={resolveMediaUrl(item.backdrop)}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
    )
  }

  return (
    <video
      ref={videoRef}
      src={trailer}
      className="absolute inset-0 h-full w-full scale-105 object-cover"
      autoPlay
      muted
      loop
      playsInline
      poster={resolveMediaUrl(item.backdrop)}
    />
  )
}
