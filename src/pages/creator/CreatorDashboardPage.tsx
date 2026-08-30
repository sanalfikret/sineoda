import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
import { CREATOR_FILM_UPLOAD_REQUIREMENTS } from '../../constants/creatorUpload'
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

const FORMAT_LABELS: Record<string, string> = {
  main: 'Ana film',
  bts: 'Kamera arkası',
  teacher_note: 'Hoca notu',
}

const SCHOOL_REVIEW_LABELS: Record<string, string> = {
  none: '—',
  pending: 'Okul onayı bekliyor',
  approved: 'Okul onaylı',
  rejected: 'Okul reddi',
}

const REVIEW_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'İncelemede',
  published: 'Yayında',
  rejected: 'Reddedildi',
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split('-').map(Number)
  return new Date(year, mon - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

export function CreatorDashboardPage() {
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
      setError(err instanceof Error ? err.message : 'Veriler yüklenemedi.')
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
      setError(err instanceof Error ? err.message : 'Belge yüklenemedi.')
    } finally {
      setDocUploading(false)
    }
  }

  const handleDeleteDocument = async (id: string) => {
    try {
      await creatorDeleteDocument(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silinemedi.')
    }
  }

  const handlePosterUpload = async (file: File) => {
    try {
      const url = await creatorUploadImage(file)
      setForm((prev) => ({ ...prev, poster: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Poster yüklenemedi.')
    }
  }

  const handleVideoUpload = async (file: File) => {
    try {
      const url = await creatorUploadVideo(file)
      setForm((prev) => ({ ...prev, videoUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video yüklenemedi.')
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
      setError(err instanceof Error ? err.message : 'Belge yüklenemedi.')
    } finally {
      setUploadingDocType(null)
    }
  }

  const handleRemoveApplicationDocument = async (id: string) => {
    try {
      await creatorDeleteDocument(id)
      setApplicationDocs((current) => current.filter((entry) => entry.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Belge silinemedi.')
    }
  }

  const handleSubmitContent = async (event: FormEvent) => {
    event.preventDefault()
    const isMainApplication = program !== 'student_cinema' || form.contentFormat === 'main'
    if (isMainApplication) {
      if (!form.downloadLink.trim()) {
        setError('Film indirme linki zorunludur.')
        return
      }
      if (!form.directors.trim()) {
        setError('Yönetmen bilgisi zorunludur.')
        return
      }
      if (!form.producers.trim()) {
        setError('Yapımcı bilgisi zorunludur.')
        return
      }
      if (!form.cast.trim()) {
        setError('Oyuncu kadrosu zorunludur.')
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
      setError(err instanceof Error ? err.message : 'Film başvurusu gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  const studioName = user?.creator?.studioName ?? 'Yapımcı'
  const mainFilms = content.filter((item) => item.contentFormat === 'main' || !item.contentFormat)

  return (
    <div className="min-h-dvh bg-[#0d0f14] text-white">
      <header className="border-b border-white/10 bg-[#11141c] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PlooyLogo tone="on-dark" className="h-8" />
            <div>
              <p className="text-lg font-bold">{studioName}</p>
              <p className="text-xs text-plooy-muted">{BRAND_NAME} Creator · {registrationPaid ? 'Aktif' : 'Ödeme bekleniyor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-plooy-muted hover:text-white">
              Ana site
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-plooy-muted hover:text-white"
            >
              Çıkış
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
            Genç Sinema programındasınız. Ana filminizi ve kamera arkası görüntülerinizi yükleyebilirsiniz.
            Okul onayından sonra {BRAND_NAME} incelemesine alınır.
          </div>
        )}

        {program === 'student_cinema' && !registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-4 text-sm text-amber-100">
            Film başvurunuzu tamamlamak için{' '}
            <strong className="text-plooy-gold">₺49 Genç Sinema başvuru ücreti</strong> ödemeniz gerekir.
            Ödeme sonrası filminiz okul ve admin incelemesine alınır.{' '}
            <Link to={creatorCheckoutPath()} className="font-semibold text-plooy-gold underline">
              Ödeme yap
            </Link>
          </div>
        )}

        {program === 'standard' && registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            Yapımcı üyeliğiniz aktiftir. Film başvurunuzu gönderin; yayına alma kararı yalnızca {BRAND_NAME}
            admin ekibi tarafından verilir.
          </div>
        )}

        {program === 'standard' && !registrationPaid && status !== 'rejected' && status !== 'suspended' && (
          <div className="mb-6 rounded-xl border border-plooy-gold/30 bg-plooy-gold/10 px-4 py-4 text-sm text-amber-100">
            Film başvurusu göndermek için{' '}
            <strong className="text-plooy-gold">₺69 yapımcı başvuru ücreti</strong> ödemeniz gerekir. Yapımcı
            üyeliğiniz otomatik açılır; filminizin onayı admin tarafından yapılır.{' '}
            <Link to={creatorCheckoutPath()} className="font-semibold text-plooy-gold underline">
              Ödeme yap
            </Link>
          </div>
        )}

        {messages.length > 0 && (
          <section className="mb-6 rounded-xl border border-white/10 bg-[#11141c] p-5">
            <h2 className="text-lg font-semibold">Bildirimler</h2>
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
                      Okundu işaretle
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {status === 'pending' && program === 'student_cinema' && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Hesabınız inceleniyor. Onaylandıktan sonra ek içerik gönderebilirsiniz.
          </div>
        )}

        {status === 'rejected' && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            Hesabınız reddedildi. Detaylar için{' '}
            <Link to="/iletisim" className="underline">
              iletişime
            </Link>{' '}
            geçin.
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(program === 'student_cinema'
            ? [
                { label: 'Toplam izlenme', value: `${totals.watchMinutes} dk` },
                { label: 'İzleyici', value: String(totals.viewers) },
                { label: 'Beğeni', value: String(totals.likes) },
                { label: 'Yayında', value: String(totals.publishedCount) },
              ]
            : [
                { label: 'Hesaplanan izlenme', value: `${totals.qualifiedMinutes} dk` },
                { label: 'Beğeni', value: String(totals.likes) },
                { label: 'Yayında', value: String(totals.publishedCount) },
                { label: 'İncelemede', value: String(totals.pendingCount) },
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
                <h2 className="text-lg font-semibold text-plooy-gold">Bu ayın izlenme özeti</h2>
                <p className="mt-1 text-sm text-plooy-muted">
                  Her ayın 1&apos;inde sıfırlanır. Yalnızca kendi filmlerinizin nitelikli izlenme dakikalarını görürsünüz.
                </p>
              </div>
              {accountingMonths.length > 0 && (
                <select
                  value={accountingMonth}
                  onChange={(event) => void loadAccounting(event.target.value)}
                  className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
                >
                  {accountingMonths.map((entry) => (
                    <option key={entry.month} value={entry.month}>
                      {formatMonthLabel(entry.month)}
                      {entry.status === 'open' ? ' (bu ay)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {accounting ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-[#11141c] p-4">
                    <p className="text-xs text-plooy-muted">Nitelikli izlenme</p>
                    <p className="mt-1 text-2xl font-bold text-plooy-gold">{accounting.totalQualifiedMinutes} dk</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#11141c] p-4">
                    <p className="text-xs text-plooy-muted">Toplam izlenme</p>
                    <p className="mt-1 text-2xl font-bold text-white">{accounting.totalWatchMinutes} dk</p>
                  </div>
                </div>
                {accounting.items.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-[#11141c] text-plooy-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">Film</th>
                          <th className="px-4 py-2 font-medium">Nitelikli dk</th>
                          <th className="px-4 py-2 font-medium">İzleyici</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounting.items.map((item) => (
                          <tr key={item.contentId} className="border-t border-white/5">
                            <td className="px-4 py-2 text-white">{item.title}</td>
                            <td className="px-4 py-2 text-plooy-gold">{item.qualifiedMinutes} dk</td>
                            <td className="px-4 py-2 text-plooy-muted">{item.viewerCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-plooy-muted">Bu dönemde henüz izlenme kaydı yok.</p>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-plooy-muted">Muhasebe verisi yüklenemedi.</p>
            )}
          </section>
        )}

        <section className="mb-8 rounded-xl border border-white/10 bg-[#11141c] p-6">
          <h2 className="text-lg font-semibold">Gelir paylaşımı</h2>
          <p className="mt-2 text-sm text-plooy-muted">
            Kazançlar, yapımcı anlaşmasında tanımlanan adil paylaşım modeline göre hesaplanır.
            Detaylı oranlar ve koşullar anlaşma metninde yer alır.
          </p>
        </section>

        <section className="mb-8 rounded-xl border border-white/10 bg-[#11141c] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Yönetmen ve yapımcı belgeleri</h2>
              <p className="mt-1 text-sm text-plooy-muted">
                Yönetmen ve yapımcı olarak telif hakkının size ait olduğunu kanıtlayan belgeler.
                Tüm yasal sorumluluk size aittir.
              </p>
            </div>
            <span className="text-sm text-plooy-muted">{documentCount} belge</span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">Belge türü</span>
              <select
                value={docType}
                onChange={(event) => setDocType(event.target.value)}
                className="rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white"
              >
                {CREATOR_DOC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-plooy-muted">PDF veya görsel</span>
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
                    {CREATOR_DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType} ·{' '}
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-plooy-gold hover:underline">
                      Görüntüle
                    </a>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDocument(doc.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Film başvurularım</h2>
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
                {showForm ? 'Başvuruyu kapat' : 'Film Başvurusu Yap'}
              </button>
            )}
          </div>

          {showForm && canSubmitFilms && (
            <form
              onSubmit={handleSubmitContent}
              className="mb-6 space-y-4 rounded-xl border border-plooy-gold/20 bg-[#11141c] p-6"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">Film Başvurusu</h3>
                <p className="mt-1 text-sm text-plooy-muted">
                  Film indirme linki, künye, ödüller ve yönetmen/yapımcı belgelerinizi gönderin. İnceleme
                  sonrası yayına alınır.
                </p>
              </div>

              <div className="rounded-xl border border-plooy-gold/25 bg-plooy-gold/5 p-4">
                <p className="text-sm font-semibold text-plooy-gold">
                  {CREATOR_FILM_UPLOAD_REQUIREMENTS.title}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-white/80">
                  {CREATOR_FILM_UPLOAD_REQUIREMENTS.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {program === 'student_cinema' && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-sm">İçerik türü</span>
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
                        <option value="main">Ana film / proje</option>
                        <option value="bts">Kamera arkası</option>
                        <option value="teacher_note">Hoca notu</option>
                      </select>
                    </label>
                    {form.contentFormat !== 'main' && (
                      <label className="block">
                        <span className="mb-1 block text-sm">Bağlı ana film</span>
                        <select
                          required
                          value={form.parentContentId}
                          onChange={(e) => setForm({ ...form, parentContentId: e.target.value })}
                          className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                        >
                          <option value="">Ana film seçin</option>
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
                  <span className="mb-1 block text-sm">Başlık</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Açıklama</span>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Tür</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ContentItem['type'] })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  >
                    <option value="film">Uzun metraj film</option>
                    <option value="belgesel">Belgesel</option>
                    <option value="kisa-film">Kısa film</option>
                    <option value="dizi">Dizi</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Yaş sınırı</span>
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
                  <span className="mb-1 block text-sm">Yıl</span>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">
                    {form.type === 'dizi' ? 'Süre (ör. 8 bölüm)' : 'Süre (dakika) *'}
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
                  <span className="mb-1 block text-sm">Türler (virgülle)</span>
                  <input
                    value={form.genres}
                    onChange={(e) => setForm({ ...form, genres: e.target.value })}
                    placeholder="Drama, Bağımsız"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Yönetmen(ler) *</span>
                  <textarea
                    required
                    rows={2}
                    value={form.directors}
                    onChange={(e) => setForm({ ...form, directors: e.target.value })}
                    placeholder="Her satıra bir isim veya virgülle ayırın"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Yapımcı(lar) *</span>
                  <textarea
                    required
                    rows={2}
                    value={form.producers}
                    onChange={(e) => setForm({ ...form, producers: e.target.value })}
                    placeholder="Her satıra bir isim veya virgülle ayırın"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Oyuncu kadrosu / ekip *</span>
                  <textarea
                    required
                    rows={3}
                    value={form.cast}
                    onChange={(e) => setForm({ ...form, cast: e.target.value })}
                    placeholder="Başrol, yan rol ve önemli ekip üyeleri"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm">Yapım / stüdyo</span>
                  <input
                    value={form.studio}
                    onChange={(e) => setForm({ ...form, studio: e.target.value })}
                    placeholder="Örn: Bağımsız yapım, stüdyo adı"
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
                  <span className="mb-1 block text-sm">Film indirme linki *</span>
                  <input
                    required
                    type="url"
                    value={form.downloadLink}
                    onChange={(e) => setForm({ ...form, downloadLink: e.target.value })}
                    placeholder="https://drive.google.com/... (H.265, Full HD)"
                    className="w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-white"
                  />
                  <p className="mt-1 text-xs text-plooy-muted">
                    Filmin tam dosyası — H.265 codec, kaliteden ödün vermeden Full HD (1080p+)
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Poster</span>
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
                  <span className="mb-1 block text-sm">Video (isteğe bağlı — önizleme)</span>
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
                    <span className="mb-1 block text-sm">Yüklenen video URL</span>
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
                {submitting ? 'Gönderiliyor...' : 'Film Başvurusu Yap'}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-plooy-muted">Yükleniyor...</p>
          ) : content.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#11141c] p-6 text-sm text-plooy-muted">
              {canSubmitFilms
                ? 'Henüz film başvurunuz yok. Yukarıdaki düğmeden başvuru yapabilirsiniz.'
                : 'Henüz film başvurunuz yok. Başvuru ücretini ödedikten sonra film gönderebilirsiniz.'}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#11141c] text-plooy-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    {program === 'student_cinema' && (
                      <th className="px-4 py-3 font-medium">Tür</th>
                    )}
                    <th className="px-4 py-3 font-medium">Durum</th>
                    {program === 'student_cinema' && (
                      <th className="px-4 py-3 font-medium">Okul</th>
                    )}
                    <th className="px-4 py-3 font-medium">İzlenme (dk)</th>
                    <th className="px-4 py-3 font-medium">İzleyici</th>
                    <th className="px-4 py-3 font-medium">Beğeni</th>
                    <th className="px-4 py-3 font-medium">Paylaş</th>
                  </tr>
                </thead>
                <tbody>
                  {content.map((item) => (
                    <tr key={item.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{item.title}</td>
                      {program === 'student_cinema' && (
                        <td className="px-4 py-3 text-plooy-muted">
                          {FORMAT_LABELS[item.contentFormat ?? 'main'] ?? item.contentFormat}
                        </td>
                      )}
                      <td className="px-4 py-3">{REVIEW_LABELS[item.reviewStatus] ?? item.reviewStatus}</td>
                      {program === 'student_cinema' && (
                        <td className="px-4 py-3 text-plooy-muted">
                          {SCHOOL_REVIEW_LABELS[item.schoolReviewStatus ?? 'none'] ?? item.schoolReviewStatus}
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
