import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { submitContactForm } from '../api/client'
import { PageFooter } from '../components/PageFooter'
import { PlooyLogo } from '../components/PlooyLogo'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useLocale } from '../i18n/LocaleContext'

const SUBJECT_VALUES = ['oneri', 'istek', 'sikayet', 'diger'] as const

export function ContactPage() {
  const { t } = useTranslation()
  const { localizePath } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState<string>('oneri')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const subjectOptions = useMemo(
    () =>
      SUBJECT_VALUES.map((value) => ({
        value,
        label: t(`contact.subjects.${value}`),
      })),
    [t],
  )

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
      setError(err instanceof Error ? err.message : t('contact.sendFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-plooy-bg">
      <header className="safe-top border-b border-white/5 px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <PlooyLogo tone="on-dark" linked linkTo={localizePath('/')} className="h-7" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-plooy-gold">{t('contact.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{t('contact.title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-plooy-muted sm:text-base">{t('contact.subtitle')}</p>

        <form onSubmit={(event) => void handleSubmit(event)} className="mt-10 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">{t('contact.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
                placeholder={t('contact.namePlaceholder')}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/80">{t('contact.email')}</span>
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
            <span className="mb-2 block text-sm font-medium text-white/80">{t('contact.subject')}</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
            >
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-white/80">{t('contact.message')}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              rows={6}
              className="w-full resize-y rounded-lg border border-white/10 bg-plooy-surface px-4 py-3 text-white outline-none focus:border-plooy-gold"
              placeholder={t('contact.messagePlaceholder')}
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
            {loading ? t('contact.submitting') : t('contact.submit')}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-plooy-muted">
          <Link to={localizePath('/')} className="text-plooy-gold hover:underline">
            {t('contact.backHome')}
          </Link>
        </p>
      </main>

      <PageFooter />
    </div>
  )
}
