function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export type ShareResult = 'shared' | 'copied' | 'cancelled'

export async function shareContent(title: string, contentId: string): Promise<ShareResult> {
  const url = `${window.location.origin}/?icerik=${encodeURIComponent(contentId)}`

  if (isMobileDevice() && navigator.share) {
    try {
      await navigator.share({ title, text: `${title} — Sineoda`, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return 'copied'
  }

  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return 'copied'
}
