import { isIP } from 'node:net'
export function getClientIp(req: { ip?: string; headers: Record<string, unknown>; socket: { remoteAddress?: string } }) {
  const peer = req.socket.remoteAddress?.replace('::ffff:', '') ?? ''
  const privatePeer = peer === '::1' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(peer)
  const forwarded = req.ip?.replace('::ffff:', '') ?? ''
  return privatePeer && isIP(forwarded) ? forwarded : (isIP(peer) ? peer : 'unknown')
}
export function getUserAgent(req: { headers: Record<string, unknown> }) {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' ? ua.slice(0,512) : null
}
