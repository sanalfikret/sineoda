import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitContactForm } from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'

const SUBJECT_OPTIONS = [
  { value: 'oneri', label: 'Öneri' },
  { value: 'istek', label: 'İstek' },
  { value: 'sikayet', label: 'Şikayet' },
  { value: 'diger', label: 'Diğer' },
]

export function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('oneri')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await submitContactForm({ name, email, subject, message })
      setSuccess(result.message)
      setName('')
      setEmail('')
      setSubject('oneri')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <PlooyLogo tone="on-dark" linked linkTo="/" className="h-7" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">İletişim</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Bize Ulaşın</h1>
        <p className="mt-3 text-sm leading-relaxed text-plooy-muted sm:text-base">
          Öneri, istek veya şikayetlerinizi bizimle paylaşın. Ekibimiz en kısa sürede size dönüş yapacaktır.
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-10 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">Ad Soyad</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
                placeholder="Adınız"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">E-posta</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
                placeholder="ornek@email.com"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Konu</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">Mesajınız</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              rows={6}
              className="w-full resize-y rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
              placeholder="Mesajınızı buraya yazın..."
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-plooy-gold py-3.5 text-base font-bold text-plooy-bg transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-10"
          >
            {loading ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
      </main>

      <PageFooter />
    </div>
  )
}
