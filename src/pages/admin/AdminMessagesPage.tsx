import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrangeableGrid } from '../../components/admin/ArrangeableGrid'
import { ResizableSplit } from '../../components/admin/ResizableSplit'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchAdminChatThread,
  fetchAdminChatThreads,
  markAdminChatThreadRead,
  resolveMediaUrl,
  sendAdminChatMessage,
  type AdminChatMessage,
  type AdminChatThread,
  type AdminCreatorProgramFilter,
} from '../../api/client'
import { AdminSearchBar } from '../../components/admin/AdminSearchBar'
import { useAdminMessages } from '../../context/AdminMessagesContext'
import { createRandomId } from '../../utils/id'

const PROGRAM_LABELS: Record<string, string> = {
  standard: 'Bağımsız yapımcı',
  student_cinema: 'Genç Sinema',
}

const AUDIENCE_LABELS: Record<'all' | 'standard' | 'student_cinema', string> = {
  all: 'Tüm yapımcılar',
  standard: 'Bağımsız yapımcılar',
  student_cinema: 'Genç Sinema öğrencileri',
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return `${first}${last}`.toLocaleUpperCase('tr-TR') || '•'
}

export function Avatar({ name, photoUrl, className = 'h-10 w-10 text-sm' }: { name: string; photoUrl?: string; className?: string }) {
  if (photoUrl) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#0d0f14] ${className}`}>
        <img src={resolveMediaUrl(photoUrl)} alt={name} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-plooy-gold/30 bg-plooy-gold/10 font-semibold text-plooy-gold ${className}`}
    >
      {initials(name)}
    </div>
  )
}

export function AdminMessagesPage() {
  const { summary, refresh: refreshSummary } = useAdminMessages()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedUserId = searchParams.get('user') ?? ''

  const [threads, setThreads] = useState<AdminChatThread[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [program, setProgram] = useState<AdminCreatorProgramFilter>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [messages, setMessages] = useState<AdminChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)

  const [replyForm, setReplyForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const replyRequestId = useRef('')

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState({ audience: 'all' as 'all' | 'standard' | 'student_cinema', subject: '', body: '' })
  const [bulkSending, setBulkSending] = useState(false)
  const bulkRequestId = useRef('')

  const threadListVersion = useRef(0)
  const messagesVersion = useRef(0)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const loadThreads = useCallback(async () => {
    const version = ++threadListVersion.current
    setThreadsLoading(true)
    try {
      const { threads: data } = await fetchAdminChatThreads({ q: query, program, unreadOnly })
      if (version === threadListVersion.current) {
        setThreads(data)
        setError('')
      }
    } catch (err) {
      if (version === threadListVersion.current) setError(err instanceof Error ? err.message : 'Sohbetler yüklenemedi.')
    } finally {
      if (version === threadListVersion.current) setThreadsLoading(false)
    }
  }, [query, program, unreadOnly])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadThreads(), 200)
    return () => window.clearTimeout(timer)
  }, [loadThreads])

  const loadMessages = useCallback(
    async (userId: string, options?: { markRead?: boolean }) => {
      const version = ++messagesVersion.current
      setMessagesLoading(true)
      try {
        const data = await fetchAdminChatThread(userId)
        if (version !== messagesVersion.current) return
        setMessages(data)
        setHasOlder(data.length >= 50)
        setError('')
        if (options?.markRead !== false && data.some((m) => !m.from_admin && !m.read_at)) {
          await markAdminChatThreadRead(userId)
          if (version !== messagesVersion.current) return
          setMessages((current) => current.map((m) => (m.from_admin ? m : { ...m, read_at: m.read_at ?? new Date().toISOString() })))
          setThreads((current) => current.map((t) => (t.userId === userId ? { ...t, unread: 0 } : t)))
          void refreshSummary()
        }
      } catch (err) {
        if (version === messagesVersion.current) setError(err instanceof Error ? err.message : 'Mesajlar yüklenemedi.')
      } finally {
        if (version === messagesVersion.current) setMessagesLoading(false)
      }
    },
    [refreshSummary],
  )

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([])
      return
    }
    setReplyForm({ subject: '', body: '' })
    replyRequestId.current = ''
    void loadMessages(selectedUserId)
  }, [selectedUserId, loadMessages])

  useEffect(() => {
    if (!selectedUserId) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(selectedUserId)
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [selectedUserId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, selectedUserId])

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.userId === selectedUserId) ?? null,
    [threads, selectedUserId],
  )

  const selectThread = (userId: string) => {
    setNotice('')
    setSearchParams(userId ? { user: userId } : {})
  }

  const loadOlder = async () => {
    if (!selectedUserId || messages.length === 0) return
    try {
      const older = await fetchAdminChatThread(selectedUserId, messages[0].id)
      setMessages((current) => [...older, ...current])
      setHasOlder(older.length >= 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eski mesajlar yüklenemedi.')
    }
  }

  const handleReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedUserId || sending) return
    setSending(true)
    setError('')
    setNotice('')
    try {
      if (!replyRequestId.current) replyRequestId.current = createRandomId()
      await sendAdminChatMessage({
        audience: 'direct',
        userId: selectedUserId,
        subject: replyForm.subject.trim(),
        body: replyForm.body.trim(),
        requestId: replyRequestId.current,
      })
      replyRequestId.current = ''
      setReplyForm({ subject: '', body: '' })
      setNotice('Mesaj gönderildi.')
      await loadMessages(selectedUserId, { markRead: false })
      void loadThreads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi.')
    } finally {
      setSending(false)
    }
  }

  const handleBulk = async (event: FormEvent) => {
    event.preventDefault()
    if (bulkSending) return
    if (!window.confirm(`${AUDIENCE_LABELS[bulkForm.audience]} grubuna toplu mesaj gönderilsin mi?`)) return
    setBulkSending(true)
    setError('')
    setNotice('')
    try {
      if (!bulkRequestId.current) bulkRequestId.current = createRandomId()
      const result = await sendAdminChatMessage({
        audience: bulkForm.audience,
        subject: bulkForm.subject.trim(),
        body: bulkForm.body.trim(),
        requestId: bulkRequestId.current,
      })
      bulkRequestId.current = ''
      setBulkForm((current) => ({ ...current, subject: '', body: '' }))
      setBulkOpen(false)
      setNotice(`Toplu mesaj gönderildi. Alıcı sayısı: ${result.sent}`)
      void loadThreads()
      if (selectedUserId) void loadMessages(selectedUserId, { markRead: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toplu mesaj gönderilemedi.')
    } finally {
      setBulkSending(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-plooy-gold focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mesajlar</h1>
          <p className="mt-1 text-sm text-plooy-muted">
            Yapımcı ve Genç Sinema öğrencilerinden gelen mesajlar. Sohbeti açtığınızda gelenler okundu sayılır.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBulkOpen((current) => !current)}
          className="rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-4 py-2 text-sm font-semibold text-plooy-gold hover:bg-plooy-gold/20"
        >
          {bulkOpen ? 'Toplu mesajı kapat' : 'Toplu mesaj gönder'}
        </button>
      </div>

      <ArrangeableGrid
        layoutKey="messages-stats"
        items={[
          { id: 'unread', label: 'Okunmamış mesaj', value: summary.unread, className: summary.unread > 0 ? 'text-amber-300' : 'text-white' },
          { id: 'read', label: 'Okunmuş mesaj', value: summary.read, className: 'text-emerald-300' },
          { id: 'total', label: 'Toplam gelen mesaj', value: summary.total, className: 'text-white' },
          { id: 'threads', label: 'Bekleyen sohbet', value: summary.unreadThreads, className: summary.unreadThreads > 0 ? 'text-amber-300' : 'text-white' },
        ].map((stat) => ({
          id: stat.id,
          node: (
            <div className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">{stat.label}</p>
              <p className={`mt-1 text-2xl font-bold ${stat.className}`}>{stat.value}</p>
            </div>
          ),
        }))}
      />

      {bulkOpen && (
        <form onSubmit={handleBulk} className="space-y-3 rounded-2xl border border-plooy-gold/20 bg-plooy-gold/5 p-5">
          <h2 className="font-semibold text-white">Toplu mesaj</h2>
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <label className="block text-sm">
              <span className="mb-1 block text-plooy-muted">Hedef grup</span>
              <select
                value={bulkForm.audience}
                onChange={(event) => setBulkForm((current) => ({ ...current, audience: event.target.value as typeof current.audience }))}
                className={inputClass}
              >
                {(Object.keys(AUDIENCE_LABELS) as Array<keyof typeof AUDIENCE_LABELS>).map((key) => (
                  <option key={key} value={key}>
                    {AUDIENCE_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-plooy-muted">Konu</span>
              <input
                required
                maxLength={200}
                value={bulkForm.subject}
                onChange={(event) => setBulkForm((current) => ({ ...current, subject: event.target.value }))}
                className={inputClass}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-plooy-muted">Mesaj</span>
            <textarea
              required
              rows={4}
              maxLength={10000}
              value={bulkForm.body}
              onChange={(event) => setBulkForm((current) => ({ ...current, body: event.target.value }))}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={bulkSending}
            className="rounded-lg bg-plooy-gold px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {bulkSending ? 'Gönderiliyor…' : 'Gruba gönder'}
          </button>
        </form>
      )}

      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>
      )}
      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <ResizableSplit
        layoutKey="messages-split"
        defaultRatio={0.45}
        left={
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#11141c]">
          <div className="space-y-3 border-b border-white/10 p-4">
            <AdminSearchBar value={query} onChange={setQuery} placeholder="Ad, e-posta veya şirket ara..." />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-plooy-muted">Program</span>
              {(
                [
                  ['all', 'Tümü'],
                  ['standard', 'Bağımsız'],
                  ['student_cinema', 'Genç Sinema'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={program === id}
                  onClick={() => setProgram(id)}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                    program === id ? 'bg-plooy-gold/15 text-plooy-gold ring-1 ring-plooy-gold/40' : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
              <button
                type="button"
                aria-pressed={unreadOnly}
                title={unreadOnly ? 'Tüm sohbetleri göster' : 'Yalnızca okunmamış mesajı olan sohbetleri göster'}
                onClick={() => setUnreadOnly((current) => !current)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  unreadOnly ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40' : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {unreadOnly ? '✓ Sadece okunmamış' : 'Sadece okunmamış'}
              </button>
              <button type="button" onClick={() => void loadThreads()} className="ml-auto text-xs text-plooy-gold hover:underline">
                Yenile
              </button>
            </div>
          </div>

          {threadsLoading && threads.length === 0 ? (
            <p className="p-6 text-sm text-plooy-muted">Yükleniyor...</p>
          ) : threads.length === 0 ? (
            <p className="p-6 text-sm text-plooy-muted">Eşleşen yapımcı yok.</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-white/5 overflow-y-auto">
              {threads.map((thread) => (
                <li key={thread.userId}>
                  <button
                    type="button"
                    onClick={() => selectThread(thread.userId)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03] ${
                      selectedUserId === thread.userId ? 'bg-plooy-gold/10' : ''
                    }`}
                  >
                    <Avatar name={thread.name} photoUrl={thread.photoUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm ${thread.unread > 0 ? 'font-semibold text-white' : 'text-white/90'}`}>
                          {thread.name}
                        </p>
                        {thread.unread > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-black">
                            {thread.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-plooy-muted">
                        {thread.studioName || '—'} · {PROGRAM_LABELS[thread.program] ?? thread.program}
                      </p>
                      <p className="mt-1 truncate text-xs text-white/60">
                        {thread.lastSubject
                          ? `${thread.lastFromAdmin ? 'Siz: ' : ''}${thread.lastSubject}`
                          : 'Henüz mesaj yok'}
                      </p>
                      <p className="text-[11px] text-plooy-muted">{formatDateTime(thread.lastAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        }
        right={
          <div className="flex min-h-[420px] flex-col rounded-2xl border border-white/10 bg-[#11141c]">
          {!selectedUserId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-plooy-muted">
              Mesajları görmek için soldan bir yapımcı seçin.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4">
                <Avatar name={selectedThread?.name ?? ''} photoUrl={selectedThread?.photoUrl} className="h-12 w-12 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{selectedThread?.name ?? 'Yapımcı'}</p>
                  <p className="truncate text-xs text-plooy-muted">
                    {selectedThread?.studioName || '—'} · {PROGRAM_LABELS[selectedThread?.program ?? ''] ?? ''}
                  </p>
                  <p className="truncate text-xs text-plooy-muted">
                    {selectedThread?.email}
                    {selectedThread?.phone ? ` · ${selectedThread.phone}` : ''}
                  </p>
                </div>
                <Link
                  to={
                    selectedThread?.program === 'student_cinema'
                      ? `/admin/genc-sinema?tab=students&user=${encodeURIComponent(selectedUserId)}`
                      : `/admin/yapimcilar?user=${encodeURIComponent(selectedUserId)}`
                  }
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-plooy-gold hover:text-plooy-gold"
                >
                  Profili aç
                </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
                {hasOlder && (
                  <button type="button" onClick={() => void loadOlder()} className="text-xs text-plooy-gold hover:underline">
                    Daha eski mesajlar
                  </button>
                )}
                {messagesLoading && messages.length === 0 ? (
                  <p className="text-sm text-plooy-muted">Yükleniyor...</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-plooy-muted">Bu yapımcıyla henüz mesajlaşma yok.</p>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`max-w-[85%] rounded-xl border px-4 py-3 text-sm ${
                        message.kind === 'system'
                          ? 'ml-auto border-sky-500/30 bg-sky-500/10'
                          : message.from_admin
                            ? 'ml-auto border-plooy-gold/30 bg-plooy-gold/10'
                            : 'border-white/10 bg-[#0d0f14]'
                      }`}
                    >
                      <p className="text-[11px] text-plooy-muted">
                        {message.kind === 'system' ? 'Plooy Sistem (otomatik bildirim)' : message.from_admin ? 'Plooy Admin' : selectedThread?.name ?? 'Yapımcı'} · {formatDateTime(message.created_at)}
                        {!message.from_admin && (
                          <span className={`ml-2 ${message.read_at ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {message.read_at ? 'okundu' : 'okunmadı'}
                          </span>
                        )}
                        {Boolean(message.from_admin) && (
                          <span className={`ml-2 ${message.read_at ? 'text-emerald-300' : 'text-white/40'}`}>
                            {message.read_at ? 'yapımcı okudu' : 'iletildi'}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 font-medium text-white">{message.subject}</p>
                      <p className="mt-1 whitespace-pre-wrap text-white/80">{message.body}</p>
                    </article>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleReply} className="space-y-2 border-t border-white/10 p-4">
                <input
                  required
                  maxLength={200}
                  placeholder="Konu"
                  value={replyForm.subject}
                  onChange={(event) => setReplyForm((current) => ({ ...current, subject: event.target.value }))}
                  className={inputClass}
                />
                <textarea
                  required
                  rows={3}
                  maxLength={10000}
                  placeholder="Mesajınız"
                  value={replyForm.body}
                  onChange={(event) => setReplyForm((current) => ({ ...current, body: event.target.value }))}
                  className={inputClass}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-lg bg-plooy-gold px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  >
                    {sending ? 'Gönderiliyor…' : 'Gönder'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadMessages(selectedUserId)}
                    className="text-xs text-plooy-gold hover:underline"
                  >
                    Sohbeti yenile
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        }
      />
    </div>
  )
}
