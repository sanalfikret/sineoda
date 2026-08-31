import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { creatorCheckoutPath } from '../../utils/billing'
import {
  creatorAddDocument,
  creatorDeleteDocument,
  creatorFetchDashboard,
  creatorFetchMe,
  creatorFetchMessages,
  creatorMarkMessageRead,
  creatorSubmitContent,
  creatorUploadDocument,
  creatorUploadImage,
  creatorUploadVideo,
  fetchCreatorAccounting,
  fetchCreatorAccountingMonths,
  type CreatorAccountingReport,
} from '../../api/client'
import { ShareButton } from '../../components/ShareButton'
import { PlooyLogo } from '../../components/PlooyLogo'
import { useAuth } from '../../context/AuthContext'
import { BRAND_NAME } from '../../constants/brand'
import { CREATOR_DOC_TYPES } from '../../constants/creatorLegal'
import {
  FilmApplicationRightsPanel,
  isFilmApplicationReady,
  missingApplicationMessage,
  type ApplicationDocument,
} from '../../components/creator/FilmApplicationRightsPanel'
import type { FilmLegalDeclarationId, FilmRightsCategoryId } from '../../constants/filmApplication'
import type { ContentItem } from '../../types/content'
import type { CreatorStatus } from '../../types/auth'
import { buildCredits } from '../../utils/credits'
import { buildFestivals } from '../../utils/duration'
import { FestivalCreditsEditor } from '../../components/admin/FestivalCreditsEditor'
import type { FestivalEntry } from '../../constants/festivals'
import { useLocale } from '../../i18n/LocaleContext'

interface CreatorDocument {
  id: string
  docType: string
  fileUrl: string
  uploadedAt: string
}

interface DashboardContent extends ContentItem {
  reviewStatus: string
  parentContentId?: string | null
  schoolReviewStatus?: string
  qualifiedMinutes: number
  watchMinutes: number
  likes: number
  viewers: number
}

const FORMAT_LABEL_KEYS: Record<string, string> = {
  main: 'formatLabels.main',
  bts: 'formatLabels.bts',
  teacher_note: 'formatLabels.teacher_note',
}

const SCHOOL_REVIEW_KEYS: Record<string, string> = {
  none: 'schoolReviewStatus.none',
  pending: 'schoolReviewStatus.pending',
  approved: 'schoolReviewStatus.approved',
  rejected: 'schoolReviewStatus.rejected',
}

const REVIEW_KEYS: Record<string, string> = {
  draft: 'reviewStatus.draft',
  pending: 'reviewStatus.pending',
  published: 'reviewStatus.published',
  rejected: 'reviewStatus.rejected',
}

function formatMonthLabel(month: string, locale: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', {
    month: 'long',
    year: 'numeric',
  })
}

export function CreatorDashboardPage() {
  const { t } = useTranslation('creator', { keyPrefix: 'dashboard' })
  const uploadRequirements = t('applications.uploadRequirements', { returnObjects: true }) as string[]
  const { locale, localizePath } = useLocale()
  const { user, logout } = useAuth()
  const [documents, setDocuments] = useState<CreatorDocument[]>([])
  const [content, setContent] = useState<DashboardContent[]>([])
  const [totals, setTotals] = useState({
    qualifiedMinutes: 0,
    watchMinutes: 0,
    likes: 0,
    viewers: 0,
    publishedCount: 0,
    pendingCount: 0,
  })
  const [status, setStatus] = useState<CreatorStatus>('pending')
  const [registrationPaid, setRegistrationPaid] = useState(false)
  const [messages, setMessages] = useState<
    Array<{ id: string; subject: string; body: string; createdAt: string; isRead: boolean }>
  >([])
  const [program, setProgram] = useState<'standard' | 'student_cinema'>('standard')
  const [documentCount, setDocumentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountingMonths, setAccountingMonths] = useState<Array<{ month: string; status: string }>>([])
  const [accountingMonth, setAccountingMonth] = useState('')
  const [accounting, setAccounting] = useState<CreatorAccountingReport | null>(null)

  const [docType, setDocType] = useState('producer')
  const [docUploading, setDocUploading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rightsDeclaration, setRightsDeclaration] = useState<Record<string, boolean>>({})
  const [applicationDocs, setApplicationDocs] = useState<ApplicationDocument[]>([])
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    duration: '',
    durationMinutes: '',
    rating: '13+',
    type: 'film' as ContentItem['type'],
    genres: '',
    downloadLink: '',
    videoUrl: '',
    poster: '',
    contentFormat: 'main' as 'main' | 'bts' | 'teacher_note',
    parentContentId: '',
    directors: '',
    producers: '',
    cast: '',
    studio: '',
    festivals: [] as FestivalEntry[],
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [me, dashboard, inbox] = await Promise.all([
        creatorFetchMe(),
        creatorFetchDashboard(),
        creatorFetchMessages().catch(() => ({ messages: [] })),
      ])
      setDocuments(me.documents)
      setContent(dashboard.content as DashboardContent[])
      setTotals(dashboard.totals)
      setStatus(dashboard.creator.status as CreatorStatus)
      setRegistrationPaid(Boolean(dashboard.creator.registrationPaid))
      setMessages(inbox.messages)
      setProgram((dashboard.creator.program as 'standard' | 'student_cinema') ?? 'standard')
      setDocumentCount(dashboard.creator.documentCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const loadAccounting = useCallback(async (month?: string) => {
    try {
      const { months } = await fetchCreatorAccountingMonths()
      setAccountingMonths(months)
      const selected = month ?? months[0]?.month ?? ''
      setAccountingMonth(selected)
      if (!selected) {
        setAccounting(null)
        return
      }
      const report = await fetchCreatorAccounting(selected)
      setAccounting(report)
    } catch {
      setAccounting(null)
    }
  }, [])

  useEffect(() => {
    if (status === 'approved' && registrationPaid) void loadAccounting()
  }, [status, registrationPaid, loadAccounting])

  const canSubmitFilms =
    status !== 'rejected' &&
    status !== 'suspended' &&
    registrationPaid

  const handleDocumentUpload = async (file: File) => {
    setDocUploading(true)
    setError('')
    try {
      const url = await creatorUploadDocument(file)
      await creatorAddDocument(docType, url)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.documentUploadFailed'))
    } finally {
      setDocUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      await creatorDeleteDocument(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.documentDeleteFailed'))
    }
  }

  const handlePosterUpload = async (file: File) => {
    try {
      const url = await creatorUploadImage(file)
      setForm((prev) => ({ ...prev, poster: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.posterUploadFailed'))
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      const url = await creatorUploadVideo(file)
      setForm((prev) => ({ ...prev, videoUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.videoUploadFailed'))
    }
  }

  const resetApplicationForm = () => {
    setRightsDeclaration({})
    setApplicationDocs([])
    setForm({
      title: '',
      description: '',
      year: new Date().getFullYear(),
      duration: '',
      durationMinutes: '',
      rating: '13+',
      type: 'film',
      genres: '',
      downloadLink: '',
      videoUrl: '',
      poster: '',
      contentFormat: 'main',
      parentContentId: '',
      directors: '',
      producers: '',
      cast: '',
      studio: '',
      festivals: [],
    })
  }

  const openApplicationForm = () => {
    resetApplicationForm()
    const studio = user?.creator?.studioName ?? ''
    setForm((current) => ({
      ...current,
      producers: studio,
      studio,
    }))
    setShowForm(true)
  }

  const handleRightsChange = (id: FilmRightsCategoryId | FilmLegalDeclarationId, checked: boolean) => {
    setRightsDeclaration((current) => ({ ...current, [id]: checked }))
  }

  const handleApplicationDocumentUpload = async (docType: string, file: File) => {
    setUploadingDocType(docType)
    setError('')
    try {
      const url = await creatorUploadDocument(file)
      const result = await creatorAddDocument(docType, url)
      const document = result.document
      setApplicationDocs((current) => [
        ...current.filter((entry) => entry.docType !== docType),
        { id: document.id, docType: document.docType, fileUrl: document.fileUrl },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.documentUploadFailed'))
    } finally {
      setUploadingDocType(null)
    }
  }

  const handleRemoveApplicationDocument = async (id: string) => {
    try {
      await creatorDeleteDocument(id)
      setApplicationDocs((current) => current.filter((entry) => entry.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.documentDeleteFailed'))
    }
  }

  const handleSubmitContent = async (event: FormEvent) => {
    event.preventDefault()
    const isMainApplication = program !== 'student_cinema' || form.contentFormat === 'main'
    if (isMainApplication) {
      if (!form.downloadLink.trim()) {
        setError(t('errors.downloadLinkRequired'))
        return
      }
      if (!form.directors.trim()) {
        setError(t('errors.directorsRequired'))
        return
      }
      if (!form.producers.trim()) {
        setError(t('errors.producersRequired'))
        return
      }
      if (!form.cast.trim()) {
        setError(t('errors.castRequired'))
        return
      }
      const missing = missingApplicationMessage(rightsDeclaration, applicationDocs)
      if (missing) {
        setError(missing)
        return
      }
    }

    setSubmitting(true)
    setError('')
    try {
      const genres = form.genres
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
      await creatorSubmitContent({
        title: form.title,
        description: form.description,
        year: form.year,
        durationMinutes: form.type === 'dizi' ? null : Number(form.durationMinutes) || null,
        duration: form.type === 'dizi' ? form.duration : undefined,
        rating: form.rating,
        type: form.type,
        genres,
        poster: form.poster,
        backdrop: form.poster,
        downloadLink: form.downloadLink.trim(),
        videoUrl: form.videoUrl.trim() || form.downloadLink.trim(),
        credits: buildCredits(form),
        festivals: buildFestivals(form.festivals),
        contentFormat: program === 'student_cinema' ? form.contentFormat : 'main',
        parentContentId:
          program === 'student_cinema' && form.contentFormat !== 'main' ? form.parentContentId : undefined,
        rightsDeclaration: isMainApplication ? rightsDeclaration : undefined,
        documentIds: isMainApplication ? applicationDocs.map((doc) => doc.id) : undefined,
      })
      setShowForm(false)
      resetApplicationForm()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const studioName = user?.creator?.studioName ?? t('defaultStudio')
  const mainFilms = content.filter((item) => item.contentFormat === 'main' || !item.contentFormat)

  return (
    <div className="min-h-dvh bg-[#0d0f14] text-white">
      <header className="border-b border-white/10 bg-[#11141c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlooyLogo tone="on-dark" className="h-8" />
            <div>
              <p className="text-lg font-bold">{studioName}</p>
              <p className="text-xs text-plooy-muted">
                {registrationPaid
                  ? t('headerSubtitleActive', { brand: BRAND_NAME })
                  : t('headerSubtitlePending', { brand: BRAND_NAME })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to={localizePath('/')} className="text-sm text-plooy-muted hover:text-white">
              {t('mainSite')}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-plooy-muted hover:text-white"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {program === 'student_cinema' && registrationPaid && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {t('studentPaidBanner', { brand: BRAND_NAME })}
          </div>
        )}

        {program === 'student_cinema' && !registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-4 text-sm text-amber-100">
            <Trans
              i18nKey="dashboard.studentUnpaidBanner"
              ns="creator"
              components={{ strong: <strong className="text-plooy-gold" /> }}
            />{' '}
            <Link to={localizePath(creatorCheckoutPath())} className="font-semibold text-plooy-gold underline">
              {t('payNow')}
            </Link>
          </div>
        )}

        {program === 'standard' && registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            {t('standardPaidBanner', { brand: BRAND_NAME })}
          </div>
        )}

        {program === 'standard' && !registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-4 text-sm text-amber-100">
            <Trans
              i18nKey="dashboard.standardUnpaidBanner"
              ns="creator"
              components={{ strong: <strong className="text-plooy-gold" /> }}
            />{' '}
            <Link to={localizePath(creatorCheckoutPath())} className="font-semibold text-plooy-gold underline">
              {t('payNow')}
            </Link>
          </div>
        )}

        {messages.length > 0 && (
          <section className="mb-6 rounded-xl border border-white/10 bg-[#11141c] p-5">
            <h2 className="text-lg font-semibold">{t('notifications')}</h2>
            <ul className="mt-3 space-y-3">
              {messages.slice(0, 5).map((message) => (
                <li
                  key={message.id}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    message.isRead
                      ? 'border-white/5 bg-[#0d0f14] text-plooy-muted'
                      : 'border-plooy-gold/30 bg-plooy-gold/5 text-white'
                  }`}
                >
                  <p className="font-medium">{message.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-white/80">{message.body}</p>
                  {!message.isRead && (
                    <button
                      type="button"
                      onClick={() => {
                        void creatorMarkMessageRead(message.id).then(() => {
                          setMessages((current) =>
                            current.map((entry) =>
                              entry.id === message.id ? { ...entry, isRead: true } : entry,
                            ),
                          )
                        })
                      }}
                      className="mt-2 text-xs text-plooy-gold hover:underline"
                    >
                      {t('markRead')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === 'pending' && program === 'student_cinema' && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            {t('pendingReviewBanner')}
          </div>
        )}

        {status === 'rejected' && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            <Trans
              i18nKey="dashboard.rejectedBanner"
              ns="creator"
              components={{
                link: <Link to={localizePath('/iletisim')} className="underline" />,
              }}
            />
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(program === 'student_cinema'
            ? [
                { label: t('stats.qualifiedWatch'), value: t('stats.minutes', { count: totals.qualifiedMinutes }) },
                { label: t('stats.totalWatch'), value: t('stats.minutes', { count: totals.watchMinutes }) },
                { label: t('stats.viewers'), value: String(totals.viewers) },
                { label: t('stats.likes'), value: String(totals.likes) },
              ]
            : [
                { label: t('stats.qualifiedWatch'), value: t('stats.minutes', { count: totals.qualifiedMinutes }) },
                { label: t('stats.likes'), value: String(totals.likes) },
                { label: t('stats.published'), value: String(totals.publishedCount) },
                { label: t('stats.pending'), value: String(totals.pendingCount) },
              ]
          ).map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-[#11141c] p-4">
              <p className="text-xs text-plooy-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-plooy-gold">{stat.value}</p>
            </div>
          ))}
        </section>

        {status === 'approved' && registrationPaid && (
          <section className="mb-8 rounded-xl border border-plooy-gold/20 bg-plooy-gold/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-plooy-gold">{t('accounting.title')}</h2>
                <p className="mt-1 text-sm text-plooy-muted">{t('accounting.description')}</p>
              </div>
              {accountingMonths.length > 0 && (
                <select
                  value={accountingMonth}
                  onChange={(event) => void loadAccounting(event.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                >
                  {accountingMonths.map((entry) => (
                    <option key={entry.month} value={entry.month}>
                      {formatMonthLabel(entry.month, locale)}
                      {entry.status === 'open' ? t('accounting.currentMonth') : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {accounting ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-[#11141c] p-4">
                    <p className="text-xs text-plooy-muted">{t('accounting.qualifiedWatch')}</p>
                    <p className="mt-1 text-2xl font-bold text-plooy-gold">
                      {t('stats.minutes', { count: accounting.totalQualifiedMinutes })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#11141c] p-4">
                    <p className="text-xs text-plooy-muted">{t('accounting.totalWatch')}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {t('stats.minutes', { count: accounting.totalWatchMinutes })}
                    </p>
                  </div>
                </div>
                {accounting.items.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#11141c] text-plooy-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">{t('accounting.filmColumn')}</th>
                          <th className="px-4 py-2 font-medium">{t('accounting.qualifiedColumn')}</th>
                          <th className="px-4 py-2 font-medium">{t('accounting.viewersColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounting.items.map((item) => (
                          <tr key={item.contentId} className="border-t border-white/5">
                            <td className="px-4 py-2 text-white">{item.title}</td>
                            <td className="px-4 py-2 text-plooy-gold">
                              {t('stats.minutes', { count: item.qualifiedMinutes })}
                            </td>
                            <td className="px-4 py-2 text-plooy-muted">{item.viewerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-plooy-muted">{t('accounting.noData')}</p>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-plooy-muted">{t('accounting.loadFailed')}</p>
            )}
          </section>
        )}

        <section className="mb-8 rounded-xl border border-white/10 bg-[#11141c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{t('documents.title')}</h2>
              <p className="mt-1 text-sm text-plooy-muted">{t('documents.description')}</p>
            </div>
            <span className="text-sm text-plooy-muted">{t('documents.count', { count: documentCount })}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">{t('documents.typeLabel')}</span>
              <select
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
              >
                {CREATOR_DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(`documents.types.${type.value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">{t('documents.fileLabel')}</span>
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={docUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void handleDocumentUpload(file)
                  event.target.value = ''
                }}
                className="text-sm text-plooy-muted file:mr-3 file:rounded-lg file:border-0 file:bg-plooy-gold file:px-3 file:py-2 file:text-sm file:font-medium file:text-plooy-bg"
              />
            </label>
          </div>

          {documents.length > 0 && (
            <ul className="mt-4 space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#0d0f14] px-3 py-2 text-sm"
                >
                  <span>
                    {t(`documents.types.${doc.docType}`, { defaultValue: doc.docType })} ·{' '}
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-plooy-gold hover:underline">
                      {t('documents.view')}
                    </a>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(doc.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    {t('documents.delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('applications.title')}</h2>
            {canSubmitFilms && (
              <button
                type="button"
                onClick={() => {
                  if (showForm) {
                    setShowForm(false)
                    resetApplicationForm()
                  } else {
                    openApplicationForm()
                  }
                }}
                className="rounded-lg bg-plooy-gold px-4 py-2 text-sm font-semibold text-plooy-bg"
              >
                {showForm ? t('applications.closeForm') : t('applications.openForm')}
              </button>
            )}
          </div>

          {showForm && canSubmitFilms && (
            <form
              onSubmit={handleSubmitContent}
              className="mb-6 space-y-4 rounded-xl border border-plooy-gold/20 bg-[#11141c] p-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{t('applications.formTitle')}</h3>
                <p className="mt-1 text-sm text-plooy-muted">{t('applications.formDescription')}</p>
              </div>

              <div className="rounded-xl border border-plooy-gold/25 bg-plooy-gold/5 p-4">
                <p className="text-sm font-semibold text-plooy-gold">
                  {t('applications.uploadRequirementsTitle')}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/80">
                  {uploadRequirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {program === 'student_cinema' && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm">{t('applications.contentFormatLabel')}</span>
                      <select
                        value={form.contentFormat}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            contentFormat: e.target.value as 'main' | 'bts' | 'teacher_note',
                            parentContentId: e.target.value === 'main' ? '' : form.parentContentId,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                      >
                        <option value="main">{t('applications.contentFormatMain')}</option>
                        <option value="bts">{t('applications.contentFormatBts')}</option>
                        <option value="teacher_note">{t('applications.contentFormatTeacher')}</option>
                      </select>
                    </label>
                    {form.contentFormat !== 'main' && (
                      <label className="block">
                        <span className="mb-1 block text-sm">{t('applications.parentFilmLabel')}</span>
                        <select
                          required
                          value={form.parentContentId}
                          onChange={(e) => setForm({ ...form, parentContentId: e.target.value })}
                          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                        >
                          <option value="">{t('applications.parentFilmPlaceholder')}</option>
                          {mainFilms.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                )}
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.titleLabel')}</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.descriptionLabel')}</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t('applications.typeLabel')}</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ContentItem['type'] })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    <option value="film">{t('applications.typeFilm')}</option>
                    <option value="belgesel">{t('applications.typeDocumentary')}</option>
                    <option value="kisa-film">{t('applications.typeShort')}</option>
                    <option value="dizi">{t('applications.typeSeries')}</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t('applications.ratingLabel')}</span>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    {['Genel', '7+', '13+', '16+', '18+'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t('applications.yearLabel')}</span>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">
                    {form.type === 'dizi' ? t('applications.durationSeriesLabel') : t('applications.durationFilmLabel')}
                  </span>
                  {form.type === 'dizi' ? (
                    <input
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  ) : (
                    <input
                      required
                      type="number"
                      min={1}
                      value={form.durationMinutes}
                      onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                      placeholder="92"
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                    />
                  )}
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.genresLabel')}</span>
                  <input
                    value={form.genres}
                    onChange={(e) => setForm({ ...form, genres: e.target.value })}
                    placeholder={t('applications.genresPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.directorsLabel')}</span>
                  <textarea
                    required
                    rows={2}
                    value={form.directors}
                    onChange={(e) => setForm({ ...form, directors: e.target.value })}
                    placeholder={t('applications.directorsPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.producersLabel')}</span>
                  <textarea
                    required
                    rows={2}
                    value={form.producers}
                    onChange={(e) => setForm({ ...form, producers: e.target.value })}
                    placeholder={t('applications.producersPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.castLabel')}</span>
                  <textarea
                    required
                    rows={3}
                    value={form.cast}
                    onChange={(e) => setForm({ ...form, cast: e.target.value })}
                    placeholder={t('applications.castPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.studioLabel')}</span>
                  <input
                    value={form.studio}
                    onChange={(e) => setForm({ ...form, studio: e.target.value })}
                    placeholder={t('applications.studioPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
              </div>

              <FestivalCreditsEditor
                entries={form.festivals}
                onChange={(festivals) => setForm({ ...form, festivals })}
                allowLaurelUpload={false}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">{t('applications.downloadLinkLabel')}</span>
                  <input
                    required
                    type="url"
                    value={form.downloadLink}
                    onChange={(e) => setForm({ ...form, downloadLink: e.target.value })}
                    placeholder={t('applications.downloadLinkPlaceholder')}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                  <p className="mt-1 text-xs text-plooy-muted">{t('applications.downloadLinkHint')}</p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t('applications.posterLabel')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handlePosterUpload(file)
                    }}
                    className="text-sm text-plooy-muted"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t('applications.videoLabel')}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleVideoUpload(file)
                    }}
                    className="text-sm text-plooy-muted"
                  />
                </label>
                {form.videoUrl && form.videoUrl !== form.downloadLink && (
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm">{t('applications.videoUrlLabel')}</span>
                    <input
                      readOnly
                      value={form.videoUrl}
                      className="w-full rounded-lg border border-white/10 bg-[#0d0f14]/50 px-3 py-2 text-sm text-plooy-muted"
                    />
                  </label>
                )}
              </div>

              {(program !== 'student_cinema' || form.contentFormat === 'main') && (
                <FilmApplicationRightsPanel
                  rightsDeclaration={rightsDeclaration}
                  onRightsChange={handleRightsChange}
                  applicationDocs={applicationDocs}
                  uploadingDocType={uploadingDocType}
                  onUploadDocument={handleApplicationDocumentUpload}
                  onRemoveDocument={(id) => void handleRemoveApplicationDocument(id)}
                />
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  ((program !== 'student_cinema' || form.contentFormat === 'main') &&
                    !isFilmApplicationReady(rightsDeclaration, applicationDocs))
                }
                className="rounded-lg bg-plooy-gold px-5 py-2.5 text-sm font-semibold text-plooy-bg disabled:opacity-60"
              >
                {submitting ? t('applications.submitting') : t('applications.submit')}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-plooy-muted">{t('applications.loading')}</p>
          ) : content.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
              {canSubmitFilms ? t('applications.emptyCanSubmit') : t('applications.emptyNeedPayment')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#11141c] text-plooy-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t('applications.columns.title')}</th>
                    {program === 'student_cinema' && (
                      <th className="px-4 py-3 font-medium">{t('applications.columns.format')}</th>
                    )}
                    <th className="px-4 py-3 font-medium">{t('applications.columns.status')}</th>
                    {program === 'student_cinema' && (
                      <th className="px-4 py-3 font-medium">{t('applications.columns.school')}</th>
                    )}
                    <th className="px-4 py-3 font-medium">{t('applications.columns.watchMinutes')}</th>
                    <th className="px-4 py-3 font-medium">{t('applications.columns.viewers')}</th>
                    <th className="px-4 py-3 font-medium">{t('applications.columns.likes')}</th>
                    <th className="px-4 py-3 font-medium">{t('applications.columns.share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {content.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{item.title}</td>
                      {program === 'student_cinema' && (
                        <td className="px-4 py-3 text-plooy-muted">
                          {t(FORMAT_LABEL_KEYS[item.contentFormat ?? 'main'] ?? item.contentFormat ?? 'formatLabels.main')}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {t(REVIEW_KEYS[item.reviewStatus] ?? item.reviewStatus)}
                      </td>
                      {program === 'student_cinema' && (
                        <td className="px-4 py-3 text-plooy-muted">
                          {t(SCHOOL_REVIEW_KEYS[item.schoolReviewStatus ?? 'none'] ?? item.schoolReviewStatus ?? 'schoolReviewStatus.none')}
                        </td>
                      )}
                      <td className="px-4 py-3">{item.watchMinutes || item.qualifiedMinutes}</td>
                      <td className="px-4 py-3">{item.viewers}</td>
                      <td className="px-4 py-3">{item.likes}</td>
                      <td className="px-4 py-3">
                        <ShareButton
                          contentId={item.id}
                          title={item.title}
                          disabled={item.reviewStatus !== 'published'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
