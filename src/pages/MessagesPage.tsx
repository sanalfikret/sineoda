import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchUserMessages,
  markUserMessageRead,
  type UserMessage,
} from '../api/client'
import { Header } from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../i18n/LocaleContext'

export function MessagesPage() {
  const { t } = useTranslation('messages')
  const { localizePath, locale } = useLocale()
  const { isAdmin, isCreator } = useAuth()
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const viewerOnly = isAdmin || isCreator
  const dateLocale = locale === 'en' ? 'en-US' : 'tr-TR'

  const load = async () => {
    if (viewerOnly) {
      setLoading(false)
      setError('')
      setMessages([])
      return
    }

    setLoading(true)
    setError('')
    try {
      const { messages: data } = await fetchUserMessages()
      setMessages(data)
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [viewerOnly])

  const selected = messages.find((message) => message.id === selectedId) ?? null

  const handleOpen = async (message: UserMessage) => {
    setSelectedId(message.id)
    setMobileDetailOpen(true)
    if (!message.isRead) {
      try {
        await markUserMessageRead(message.id)
        setMessages((current) =>
          current.map((entry) =>
            entry.id === message.id ? { ...entry, isRead: true, readAt: new Date().toISOString() } : entry,
          ),
        )
      } catch {
        // ignore read errors in UI
      }
    }
  }

  return (
    <div className="min-h-dvh bg-plooy-bg text-white">
      <Header />
      <main className="mobile-page-bottom mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <Link to={localizePath('/')} className="text-sm text-plooy-muted hover:text-white">
            {t('backHome')}
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-plooy-muted">{t('subtitle')}</p>
        </div>

        {viewerOnly ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
            <p className="font-medium">{t('viewerOnlyTitle')}</p>
            <p className="mt-2 text-amber-100/80">{t('viewerOnlyBody')}</p>
            {isAdmin && (
              <Link to="/admin/kullanicilar" className="mt-4 inline-block text-plooy-gold hover:underline">
                {t('adminViewersLink')}
              </Link>
            )}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
            {error}
          </div>
        ) : loading ? (
          <p className="text-sm text-plooy-muted">{t('loading')}</p>
        ) : messages.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
            {t('empty')}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div
              className={`overflow-hidden rounded-xl border border-white/10 bg-[#11141c] ${
                mobileDetailOpen ? 'hidden lg:block' : 'block'
              }`}
            >
              <ul>
                {messages.map((message) => (
                  <li key={message.id} className="border-b border-white/5 last:border-0">
                    <button
                      type="button"
                      onClick={() => void handleOpen(message)}
                      className={`w-full px-4 py-3.5 text-left transition hover:bg-white/[0.03] ${
                        selectedId === message.id ? 'bg-white/[0.05]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${message.isRead ? 'text-white/80' : 'font-semibold text-white'}`}>
                          {message.subject}
                        </p>
                        {!message.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-plooy-gold" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-plooy-muted">{message.body}</p>
                      <p className="mt-1 text-xs text-plooy-muted">
                        {new Date(message.createdAt).toLocaleDateString(dateLocale)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={`rounded-xl border border-white/10 bg-[#11141c] p-5 sm:p-6 ${
                mobileDetailOpen ? 'block' : 'hidden lg:block'
              }`}
            >
              {selected ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    className="mb-4 text-sm text-plooy-gold lg:hidden"
                  >
                    {t('backToList')}
                  </button>
                  <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-plooy-muted">
                    {new Date(selected.createdAt).toLocaleString(dateLocale)}
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/90">{selected.body}</p>
                </>
              ) : (
                <p className="text-sm text-plooy-muted">{t('selectMessage')}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
