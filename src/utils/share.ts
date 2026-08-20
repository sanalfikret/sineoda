export function buildShareUrl(contentId: string) {
  return `${window.location.origin}/icerik/${encodeURIComponent(contentId)}`
}

export function buildShareMessage(title: string, url: string) {
  return `${title} — Sineoda'da izle\n${url}`
}

export async function copyShareLink(url: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = url
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export interface ShareChannel {
  id: string
  label: string
  color: string
  open: (message: string, url: string) => void
}

export function getShareChannels(): ShareChannel[] {
  return [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      color: '#25D366',
      open: (message, _url) => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer',
        )
      },
    },
    {
      id: 'telegram',
      label: 'Telegram',
      color: '#229ED9',
      open: (message, url) => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
          '_blank',
          'noopener,noreferrer',
        )
      },
    },
    {
      id: 'x',
      label: 'X',
      color: '#ffffff',
      open: (message, url) => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
          '_blank',
          'noopener,noreferrer',
        )
      },
    },
    {
      id: 'facebook',
      label: 'Facebook',
      color: '#1877F2',
      open: (_message, url) => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          '_blank',
          'noopener,noreferrer',
        )
      },
    },
    {
      id: 'instagram',
      label: 'Instagram',
      color: '#E4405F',
      open: (_message, _url) => {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
      },
    },
  ]
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export async function openNativeShare(title: string, contentId: string) {
  const url = buildShareUrl(contentId)
  const text = buildShareMessage(title, url)
  if (!isMobileDevice() || !navigator.share) return false

  try {
    await navigator.share({ title, text, url })
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true
    return false
  }
}
