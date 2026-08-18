export async function shareContent(title: string, contentId: string) {
  const url = `${window.location.origin}/?icerik=${encodeURIComponent(contentId)}`

  if (navigator.share) {
    try {
      await navigator.share({ title, text: `${title} — Sineoda`, url })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }

  await navigator.clipboard.writeText(url)
  alert('Bağlantı panoya kopyalandı.')
}
