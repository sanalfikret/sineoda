export function inferStreamProvider(url: string) {
  const value = url.trim().toLowerCase()
  if (!value) return 'bunny'
  if (/bunny\.net|b-cdn\.net|mediadelivery\.net/.test(value)) return 'bunny'
  if (/cloudflarestream\.com|videodelivery\.net/.test(value)) return 'cloudflare'
  if (/mux\.com|stream\.mux/.test(value)) return 'mux'
  if (/vimeo\.com|player\.vimeo/.test(value)) return 'vimeo'
  return 'custom'
}

export function resolveStreamProvider(body: Record<string, unknown>, videoUrl: string) {
  const explicit = body.streamProvider ?? body.stream_provider
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim()
  return inferStreamProvider(videoUrl)
}
