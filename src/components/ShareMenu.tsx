import { useEffect, useRef, useState } from 'react'
import {
  buildShareMessage,
  buildShareUrl,
  copyShareLink,
  getShareChannels,
  openNativeShare,
} from '../utils/share'

interface ShareMenuProps {
  contentId: string
  title: string
  onClose: () => void
}

export function ShareMenu({ contentId, title, onClose }: ShareMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const url = buildShareUrl(contentId)
  const message = buildShareMessage(title, url)
  const channels = getShareChannels()

  useEffect(() => {
    void copyShareLink(url).then(() => setCopied(true))
  }, [url])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const handleCopy = async () => {
    await copyShareLink(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = async () => {
    const shared = await openNativeShare(title, contentId)
    if (shared) onClose()
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,280px)] overflow-hidden rounded-xl border border-white/15 bg-[#141820] shadow-2xl"
      role="menu"
      aria-label="Paylaşım seçenekleri"
    >
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Paylaş</p>
        <p className="mt-0.5 text-xs text-sineoda-muted">
          {copied ? 'Bağlantı kopyalandı — platform seç' : 'Bağlantı hazırlanıyor...'}
        </p>
      </div>

      <div className="p-2">
        {typeof navigator.share === 'function' && (
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleNativeShare()}
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sineoda-gold/20 text-sineoda-gold">
              ↗
            </span>
            Diğer uygulamalar
          </button>
        )}

        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            role="menuitem"
            onClick={() => {
              void channel.open(message, url)
              onClose()
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/10"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-sineoda-bg"
              style={{ backgroundColor: channel.color }}
            >
              {channel.label.charAt(0)}
            </span>
            {channel.label}
          </button>
        ))}

        <button
          type="button"
          role="menuitem"
          onClick={() => void handleCopy()}
          className="mt-1 flex w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-left text-sm text-white/90 transition hover:bg-white/5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-base">
            ⧉
          </span>
          Linki tekrar kopyala
        </button>
      </div>
    </div>
  )
}
