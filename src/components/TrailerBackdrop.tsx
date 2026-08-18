import { useEffect, useRef } from 'react'
import { resolveMediaUrl } from '../api/client'
import type { ContentItem } from '../types/content'
import { getYoutubeEmbedUrl, isYoutubeUrl } from '../utils/media'

interface TrailerBackdropProps {
  item: ContentItem
}

export function TrailerBackdrop({ item }: TrailerBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trailer = item.trailerUrl ? resolveMediaUrl(item.trailerUrl) : ''
  const youtubeEmbedUrl =
    trailer && isYoutubeUrl(trailer)
      ? getYoutubeEmbedUrl(trailer, { autoplay: true, mute: true, loop: true, controls: false })
      : null

  useEffect(() => {
    const video = videoRef.current
    if (!video || !trailer || youtubeEmbedUrl) return
    video.muted = true
    void video.play().catch(() => undefined)
  }, [trailer, youtubeEmbedUrl])

  if (!trailer) {
    return (
      <img
        src={resolveMediaUrl(item.backdrop)}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
      />
    )
  }

  if (youtubeEmbedUrl) {
    return (
      <iframe
        src={youtubeEmbedUrl}
        title={`${item.title} fragman`}
        className="pointer-events-none absolute inset-0 h-full w-full scale-105 object-cover"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
