export function getYoutubeVideoId(url: string): string | null {
  const value = url.trim()
  if (!value) return null

  try {
    const parsed = new URL(value)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] || null
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || null
      }
      return parsed.searchParams.get('v')
    }
  } catch {
    return null
  }

  return null
}

export function isYoutubeUrl(url: string) {
  return Boolean(getYoutubeVideoId(url))
}

export function getYoutubeEmbedUrl(
  url: string,
  options: {
    autoplay?: boolean
    mute?: boolean
    loop?: boolean
    controls?: boolean
  } = {},
) {
  const id = getYoutubeVideoId(url)
  if (!id) return null

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  })

  if (options.autoplay) params.set('autoplay', '1')
  if (options.mute) params.set('mute', '1')
  if (options.loop) {
    params.set('loop', '1')
    params.set('playlist', id)
  }
  if (options.controls === false) params.set('controls', '0')

  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
