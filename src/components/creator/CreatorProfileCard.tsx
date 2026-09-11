import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { creatorUpdateProfile, resolveMediaUrl, uploadProfileAvatar } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { BRAND_NAME } from '../../constants/brand'

interface CreatorProfileCardProps {
  registrationPaid: boolean
  onSaved?: () => void | Promise<void>
}

function initialsOf(firstName: string, lastName: string, fallback: string) {
  const first = firstName.trim().charAt(0)
  const last = lastName.trim().charAt(0)
  const combined = `${first}${last}`.trim()
  if (combined) return combined.toLocaleUpperCase('tr-TR')
  return fallback.trim().charAt(0).toLocaleUpperCase('tr-TR') || '•'
}

function PhotoCircle({
  photoUrl,
  firstName,
  lastName,
  fallback,
  className,
}: {
  photoUrl: string
  firstName: string
  lastName: string
  fallback: string
  className: string
}) {
  if (photoUrl) {
    return (
      <div className={`overflow-hidden rounded-full border border-white/10 bg-[#0d0f14] ${className}`}>
        <img src={resolveMediaUrl(photoUrl)} alt={`${firstName} ${lastName}`.trim()} className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-plooy-gold/40 bg-plooy-gold/10 font-bold text-plooy-gold ${className}`}
    >
      {initialsOf(firstName, lastName, fallback)}
    </div>
  )
}

export function CreatorProfileCard({ registrationPaid, onSaved }: CreatorProfileCardProps) {
  const { t } = useTranslation('creator', { keyPrefix: 'dashboard' })
  const { user, refreshUser } = useAuth()
  const creator = user?.creator ?? null

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [form, setForm] = useState({
    firstName: creator?.firstName ?? '',
    lastName: creator?.lastName ?? '',
    studioName: creator?.studioName ?? '',
    bio: creator?.bio ?? '',
    photoUrl: creator?.photoUrl ?? '',
  })

  useEffect(() => {
    if (editing) return
    setForm({
      firstName: creator?.firstName ?? '',
      lastName: creator?.lastName ?? '',
      studioName: creator?.studioName ?? '',
      bio: creator?.bio ?? '',
      photoUrl: creator?.photoUrl ?? '',
    })
  }, [creator?.firstName, creator?.lastName, creator?.studioName, creator?.bio, creator?.photoUrl, editing])

  if (!user || !creator) return null

  const displayFirst = creator.firstName ?? ''
  const displayLast = creator.lastName ?? ''
  const fullName = `${displayFirst} ${displayLast}`.trim() || user.name

  const startEditing = () => {
    setError('')
    setNotice('')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setError('')
  }

  const handlePhotoFile = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadProfileAvatar(file)
      setForm((current) => ({ ...current, photoUrl: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.photoUploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || uploading) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await creatorUpdateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        studioName: form.studioName.trim(),
        bio: form.bio.trim(),
        photoUrl: form.photoUrl.trim(),
      })
      await refreshUser()
      setEditing(false)
      setNotice(t('profile.saved'))
      if (onSaved) await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.profileSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#0d0f14] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-plooy-gold focus:outline-none'

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-[#11141c] p-5">
      {!editing ? (
        <div className="flex flex-wrap items-center gap-4">
          <PhotoCircle
            photoUrl={creator.photoUrl ?? ''}
            firstName={displayFirst}
            lastName={displayLast}
            fallback={fullName}
            className="h-20 w-20 text-2xl"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold text-white">{fullName || t('profile.noName')}</p>
            <p className="truncate text-base text-plooy-gold">{creator.studioName || t('defaultStudio')}</p>
            <p className="mt-1 text-xs text-plooy-muted">
              {registrationPaid
                ? t('headerSubtitleActive', { brand: BRAND_NAME })
                : t('headerSubtitlePending', { brand: BRAND_NAME })}
              {' · '}
              {user.email}
            </p>
            {creator.bio && <p className="mt-2 max-w-2xl text-sm text-white/70">{creator.bio}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={startEditing}
              className="rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-4 py-2 text-sm font-medium text-plooy-gold hover:bg-plooy-gold/20"
            >
              {t('profile.edit')}
            </button>
            {notice && <p className="text-xs text-emerald-300">{notice}</p>}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('profile.title')}</h2>
            <p className="mt-1 text-sm text-plooy-muted">{t('profile.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <PhotoCircle
              photoUrl={form.photoUrl}
              firstName={form.firstName}
              lastName={form.lastName}
              fallback={fullName}
              className="h-24 w-24 text-3xl"
            />
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">{t('profile.photo')}</p>
              <p className="text-xs text-plooy-muted">{t('profile.photoHint')}</p>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:border-plooy-gold hover:text-plooy-gold">
                  {uploading
                    ? t('profile.photoUploading')
                    : form.photoUrl
                      ? t('profile.photoChange')
                      : t('profile.photoUpload')}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading || saving}
                    onChange={(event) => void handlePhotoFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                {form.photoUrl && (
                  <button
                    type="button"
                    disabled={uploading || saving}
                    onClick={() => setForm((current) => ({ ...current, photoUrl: '' }))}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-plooy-muted hover:text-red-300"
                  >
                    {t('profile.photoRemove')}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-plooy-muted">{t('profile.firstName')}</span>
              <input
                required
                maxLength={80}
                value={form.firstName}
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-plooy-muted">{t('profile.lastName')}</span>
              <input
                required
                maxLength={80}
                value={form.lastName}
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-plooy-muted">{t('profile.studioName')}</span>
              <input
                required
                maxLength={120}
                value={form.studioName}
                onChange={(event) => setForm((current) => ({ ...current, studioName: event.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-plooy-muted">{t('profile.bio')}</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                className={inputClass}
              />
            </label>
            <p className="text-xs text-plooy-muted sm:col-span-2">
              {t('profile.emailLabel')}: {user.email}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-plooy-gold px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-white/10 px-5 py-2 text-sm text-plooy-muted hover:text-white"
            >
              {t('profile.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
