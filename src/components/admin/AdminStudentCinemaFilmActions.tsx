import { useState } from 'react'
import {
  deleteAdminStudentCinemaContent,
  reviewAdminStudentCinemaContent,
  reviewAdminStudentCinemaSchool,
  type AdminStudentCinemaItem,
} from '../../api/client'
import { formatPublishDate, isScheduledStudentFilm, toDateTimeLocalValue } from '../../utils/studentCinemaAdmin'

interface AdminStudentCinemaFilmActionsProps {
  item: AdminStudentCinemaItem
  onDetail: () => void
  onChanged: () => void
  onError: (message: string) => void
}

export function AdminStudentCinemaFilmActions({
  item,
  onDetail,
  onChanged,
  onError,
}: AdminStudentCinemaFilmActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleAt, setScheduleAt] = useState(toDateTimeLocalValue(item.publishedAt))

  const run = async (action: string, task: () => Promise<void>) => {
    setLoading(action)
    onError('')
    try {
      await task()
      onChanged()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'İşlem başarısız.')
    } finally {
      setLoading(null)
    }
  }

  const handleApproveSchool = () =>
    void run('school', async () => {
      await reviewAdminStudentCinemaSchool(item.id, 'approved')
    })

  const handlePublishNow = () =>
    void run('publish', async () => {
      if (item.schoolReviewStatus !== 'approved') {
        throw new Error('Yayınlamadan önce okul onayı gerekli. Detay panelinden onaylayın.')
      }
      await reviewAdminStudentCinemaContent(item.id, 'published', { publishNow: true })
    })

  const handleUnpublish = () =>
    void run('unpublish', async () => {
      await reviewAdminStudentCinemaContent(item.id, 'pending')
    })

  const handleReject = () => {
    if (!window.confirm(`"${item.title}" reddedilsin mi?`)) return
    void run('reject', async () => {
      await reviewAdminStudentCinemaContent(item.id, 'rejected')
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`"${item.title}" kalıcı olarak silinsin mi? Bu işlem geri alınamaz.`)) return
    void run('delete', async () => {
      await deleteAdminStudentCinemaContent(item.id)
    })
  }

  const handleSchedule = () =>
    void run('schedule', async () => {
      if (!scheduleAt) {
        throw new Error('Yayın tarihi seçin.')
      }
      if (item.schoolReviewStatus !== 'approved') {
        throw new Error('Planlamadan önce okul onayı gerekli.')
      }
      await reviewAdminStudentCinemaContent(item.id, 'published', {
        publishedAt: new Date(scheduleAt).toISOString(),
      })
      setShowSchedule(false)
    })

  const isPublished = item.reviewStatus === 'published'
  const isScheduled = isScheduledStudentFilm(item)

  return (
    <div className="min-w-[220px] space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onDetail}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-medium text-white hover:bg-white/10"
        >
          Detay / Künye
        </button>
        {isPublished ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={handleUnpublish}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
          >
            {loading === 'unpublish' ? '...' : isScheduled ? 'Planı İptal Et' : 'Yayından Al'}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading !== null || item.schoolReviewStatus !== 'approved'}
            onClick={handlePublishNow}
            className="rounded-lg bg-emerald-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
          >
            {loading === 'publish' ? '...' : 'Yayınla'}
          </button>
        )}
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => {
            setScheduleAt(toDateTimeLocalValue(item.publishedAt))
            setShowSchedule((open) => !open)
          }}
          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
        >
          Tarih Planla
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={handleDelete}
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-60"
        >
          {loading === 'delete' ? '...' : 'Sil'}
        </button>
      </div>

      {item.schoolReviewStatus !== 'approved' && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={handleApproveSchool}
          className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-medium text-emerald-200"
        >
          {loading === 'school' ? '...' : 'Okul Onayı Ver (sonra yayınla)'}
        </button>
      )}

      {item.schoolReviewStatus !== 'approved' && (
        <p className="text-[11px] leading-snug text-amber-200/80">
          Yayınlamak veya planlamak için önce okul onayı gerekli.
        </p>
      )}

      {showSchedule && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-2.5">
          <label className="block text-[11px] text-sineoda-muted">Yayın tarihi ve saati</label>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(event) => setScheduleAt(event.target.value)}
            className="mt-1 w-full rounded border border-white/10 bg-[#0d0f14] px-2 py-1.5 text-xs text-white"
          />
          <p className="mt-1 text-[11px] text-sineoda-muted">
            Mevcut: {formatPublishDate(item.publishedAt)}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={loading !== null}
              onClick={handleSchedule}
              className="rounded bg-sky-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading === 'schedule' ? '...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              className="rounded px-2 py-1 text-xs text-sineoda-muted"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={loading !== null}
        onClick={handleReject}
        className="w-full rounded-lg border border-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10 disabled:opacity-60"
      >
        {loading === 'reject' ? '...' : 'Reddet'}
      </button>
    </div>
  )
}
