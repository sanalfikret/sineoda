import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadProfileAvatar } from '../api/client'
import { ProfileAvatar } from './ProfileAvatar'
import { PROFILE_AVATARS } from '../types/auth'
import { isProfilePhoto } from '../utils/profileAvatar'

interface ProfileAvatarPickerProps {
  value: string
  onChange: (avatar: string) => void
  name?: string
}

export function ProfileAvatarPicker({ value, onChange, name = '' }: ProfileAvatarPickerProps) {
  const { t } = useTranslation('account')
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError(t('avatar.invalidImage'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t('avatar.tooLarge'))
      return
    }

    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadProfileAvatar(file)
      onChange(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t('avatar.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <ProfileAvatar
          avatar={value}
          name={name}
          className="h-16 w-16 shrink-0 sm:h-20 sm:w-20"
          emojiClassName="text-3xl sm:text-4xl"
        />
        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            {uploading ? t('avatar.uploading') : t('avatar.uploadPhoto')}
          </button>
          <p className="mt-1 text-xs text-plooy-muted">{t('avatar.photoHint')}</p>
          {isProfilePhoto(value) && (
            <button
              type="button"
              onClick={() => onChange(PROFILE_AVATARS[0])}
              className="mt-1 text-xs text-plooy-gold hover:underline"
            >
              {t('avatar.useEmoji')}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handlePhotoSelect(event)}
        />
      </div>

      {!isProfilePhoto(value) && (
        <div className="flex flex-wrap gap-2">
          {PROFILE_AVATARS.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => onChange(avatar)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${
                value === avatar
                  ? 'bg-plooy-gold/20 ring-2 ring-plooy-gold'
                  : 'bg-plooy-bg hover:bg-white/5'
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>
      )}

      {uploadError && <p className="text-sm text-red-300">{uploadError}</p>}
    </div>
  )
}
