export function getClientIp(req: {
  headers: Record<string, unknown>
  socket: { remoteAddress?: string }
}) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || '127.0.0.1'
  if (Array.isArray(forwarded) && forwarded[0]) return String(forwarded[0]).trim()
  return req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1'
}

export function getUserAgent(req: { headers: Record<string, unknown> }) {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua.slice(0, 512) : null
}
