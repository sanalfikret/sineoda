import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminChatRecent, type AdminChatRecentMessage } from '../../api/client'
import { useAdminMessages } from '../../context/AdminMessagesContext'
import { Avatar } from '../../pages/admin/AdminMessagesPage'

const PROGRAM_LABELS: Record<string, string> = {
  standard: 'Bağımsız',
  student_cinema: 'Genç Sinema',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Özet sayfası — okunmuş/okunmamış sayaçları ve son gelen mesajlar (üst çubukla aynı kaynaktan). */
export function AdminMessagesOverview() {
  const { summary, loaded, error } = useAdminMessages()
  const [recent, setRecent] = useState<AdminChatRecentMessage[]>([])

  const loadRecent = useCallback(() => {
    void fetchAdminChatRecent(5)
      .then(({ messages }) => setRecent(messages))
      .catch(() => setRecent([]))
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent, summary.total, summary.unread])

  return (
    <section
      className={`rounded-2xl border p-5 ${
        summary.unread > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-[#11141c]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Yapımcı mesajları</h2>
          <p className="mt-1 text-sm text-plooy-muted">
            {loaded
              ? summary.unread > 0
                ? `${summary.unread} okunmamış mesaj bekliyor.`
                : 'Bekleyen okunmamış mesaj yok.'
              : 'Yükleniyor...'}
          </p>
        </div>
        <Link
          to="/admin/mesajlar"
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            summary.unread > 0 ? 'bg-amber-500 text-black hover:bg-amber-400' : 'border border-white/10 text-white/80 hover:bg-white/5'
          }`}
        >
          Gelen kutusunu aç
        </Link>
      </div>

      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-4">
          <p className="text-xs text-plooy-muted">Okunmamış</p>
          <p className={`mt-1 text-2xl font-bold ${summary.unread > 0 ? 'text-amber-300' : 'text-white'}`}>{summary.unread}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-4">
          <p className="text-xs text-plooy-muted">Okunmuş</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{summary.read}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#0d0f14]/70 p-4">
          <p className="text-xs text-plooy-muted">Toplam gelen</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.total}</p>
        </div>
      </div>

      {recent.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10 bg-[#0d0f14]/70">
          {recent.map((message) => (
            <li key={message.id}>
              <Link
                to={`/admin/mesajlar?user=${encodeURIComponent(message.userId)}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03]"
              >
                <Avatar name={message.name} photoUrl={message.photoUrl} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${message.isRead ? 'text-white/80' : 'font-semibold text-white'}`}>{message.name}</p>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-plooy-muted">
                      {PROGRAM_LABELS[message.program] ?? message.program}
                    </span>
                    {!message.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-label="okunmamış" />}
                  </div>
                  <p className="truncate text-xs text-white/70">{message.subject}</p>
                </div>
                <span className="shrink-0 text-[11px] text-plooy-muted">{formatDateTime(message.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
