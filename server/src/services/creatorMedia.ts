export function externalMediaLink(value: unknown, required = false) {
  const link = String(value ?? '').trim()
  if (!link && !required) return ''
  try {
    const url = new URL(link)
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error()
    return link
  } catch { throw new Error('Film ve fragman için geçerli bir HTTP/HTTPS linki gereklidir.') }
}
