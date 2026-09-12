import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { createRandomId } from '../utils/id'
import { withRequestDeadline } from '../utils/requestDeadline'

type Message = {
  id: string
  subject: string
  body: string
  from_admin: number
  created_at: string
  read_at: string | null
  kind?: 'chat' | 'system'
}

/**
 * Yapımcı paneli — tek mesaj akışı: admin ile karşılıklı sohbet + sistem bildirimleri
 * (film incelemesi, üyelik uzatma, duyurular). Aynı zaman çizelgesinde, tek okundu işareti.
 */
export function CreatorMessages() {
  const { i18n } = useTranslation()
  const en = i18n.language.startsWith('en')
  const text = (tr: string, english: string) => (en ? english : tr)

  const [messages, setMessages] = useState<Message[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [loaded, setLoaded] = useState(false)
  const requestId = useRef('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const messageApi = useCallback(
    <T,>(path: string, options: RequestInit = {}) =>
      withRequestDeadline(
        (signal) => api<T>(path, { ...options, signal }),
        text(
          'Sunucudan yanıt alınamadı. Mesajları yenileyebilir veya tekrar deneyebilirsiniz.',
          'No server response. Refresh messages or try again.',
        ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [en],
  )

  const reload = useCallback(
    async (older = false) => {
      try {
        const data = await messageApi<Message[]>('/api/creator-chat' + (older && messages[0] ? '?before=' + messages[0].id : ''))
        setMessages((current) => (older ? [...data, ...current] : data))
        if (older && data.length === 0) setNotice(text('Daha eski mesaj yok.', 'No earlier messages.'))
      } catch (err) {
        setNotice((err as Error).message)
      } finally {
        setLoaded(true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messageApi, messages],
  )

  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, 30_000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const unread = messages.filter((m) => m.from_admin && !m.read_at).length

  const markRead = async (message: Message) => {
    try {
      await messageApi('/api/creator-chat/' + message.id + '/read', { method: 'PATCH' })
      setMessages((current) => current.map((m) => (m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m)))
    } catch (err) {
      setNotice((err as Error).message)
    }
  }

  const markAllRead = async () => {
    const pending = messages.filter((m) => m.from_admin && !m.read_at)
    for (const message of pending) await markRead(message)
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      if (!requestId.current) requestId.current = createRandomId()
      await messageApi<{ sent: number }>('/api/creator-chat', {
        method: 'POST',
        body: JSON.stringify({ subject, body, requestId: requestId.current }),
      })
      setSubject('')
      setBody('')
      requestId.current = ''
      setNotice(text('Mesajınız Plooy ekibine iletildi.', 'Your message was sent to the Plooy team.'))
      await reload()
      bottomRef.current?.scrollIntoView({ block: 'end' })
    } catch (err) {
      setNotice((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const senderLabel = (m: Message) => {
    if (!m.from_admin) return text('Siz', 'You')
    return m.kind === 'system' ? text('Plooy Sistem', 'Plooy System') : text('Plooy Ekibi', 'Plooy Team')
  }

  return (
    <details open={unread > 0 || !loaded} className="my-6 rounded-xl border border-white/15 bg-[#11141c] p-5 text-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-xl font-semibold">
        <span>
          {text('Mesajlar', 'Messages')}
          <span className="ml-2 text-sm font-normal text-plooy-muted">
            {text('Bildirimler ve admin ile yazışma tek akışta', 'Notifications and admin chat in one feed')}
          </span>
        </span>
        {unread > 0 && (
          <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-black">
            {unread} {text('okunmamış', 'unread')}
          </span>
        )}
      </summary>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={() => void reload()} className="text-plooy-gold hover:underline">
            {text('Yenile', 'Refresh')}
          </button>
          <button type="button" onClick={() => void reload(true)} className="text-plooy-muted hover:text-white">
            {text('Daha eski mesajlar', 'Earlier messages')}
          </button>
          {unread > 0 && (
            <button type="button" onClick={() => void markAllRead()} className="ml-auto text-plooy-gold hover:underline">
              {text('Tümünü okundu işaretle', 'Mark all as read')}
            </button>
          )}
        </div>

        <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
          {loaded && messages.length === 0 && (
            <p className="text-sm text-plooy-muted">
              {text('Henüz mesaj yok. Aşağıdan Plooy ekibine yazabilirsiniz.', 'No messages yet. You can write to the Plooy team below.')}
            </p>
          )}
          {messages.map((m) => {
            const isSystem = m.kind === 'system'
            const mine = !m.from_admin
            return (
              <article
                key={m.id}
                className={`rounded-lg border p-3 ${
                  mine
                    ? 'ml-6 border-plooy-gold/25 bg-plooy-gold/5'
                    : isSystem
                      ? 'border-sky-500/25 bg-sky-500/5'
                      : 'mr-6 border-white/10 bg-[#0d0f14]'
                } ${m.from_admin && !m.read_at ? 'ring-1 ring-amber-400/50' : ''}`}
              >
                <p className={`text-xs ${isSystem ? 'text-sky-200' : 'text-plooy-gold'}`}>
                  {senderLabel(m)} · {new Date(m.created_at).toLocaleString(en ? 'en-GB' : 'tr-TR')}
                  {m.from_admin && !m.read_at && <span className="ml-2 text-amber-300">{text('yeni', 'new')}</span>}
                </p>
                <strong className="mt-1 block">{m.subject}</strong>
                <p className="mt-1 whitespace-pre-wrap text-white/85">{m.body}</p>
                {m.from_admin && !m.read_at && (
                  <button type="button" onClick={() => void markRead(m)} className="mt-2 text-xs text-plooy-gold hover:underline">
                    {text('Okundu işaretle', 'Mark as read')}
                  </button>
                )}
              </article>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-sm font-medium text-white">{text('Plooy ekibine yaz', 'Write to the Plooy team')}</p>
          <fieldset disabled={busy} className="space-y-3">
            <input
              required
              maxLength={200}
              className="block w-full rounded bg-[#0d0f14] p-3"
              placeholder={text('Konu', 'Subject')}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value)
                requestId.current = ''
              }}
            />
            <textarea
              required
              maxLength={10000}
              rows={4}
              className="block w-full rounded bg-[#0d0f14] p-3"
              placeholder={text('Mesajınız', 'Your message')}
              value={body}
              onChange={(e) => {
                setBody(e.target.value)
                requestId.current = ''
              }}
            />
            <button type="submit" disabled={busy} className="rounded bg-plooy-gold px-5 py-3 text-black disabled:opacity-40">
              {busy ? text('Gönderiliyor…', 'Sending…') : text('Mesaj gönder', 'Send message')}
            </button>
          </fieldset>
        </form>
        <p role="status" className="text-sm text-plooy-muted">{notice}</p>
      </div>
    </details>
  )
}
