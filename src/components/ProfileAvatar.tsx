import { resolveMediaUrl } from '../api/client'
import { isProfilePhoto } from '../utils/profileAvatar'

interface ProfileAvatarProps {
  avatar: string
  name?: string
  className?: string
  imageClassName?: string
  emojiClassName?: string
}

export function ProfileAvatar({
  avatar,
  name = '',
  className = '',
  imageClassName = 'h-full w-full object-cover',
  emojiClassName = 'text-4xl',
}: ProfileAvatarProps) {
  if (isProfilePhoto(avatar)) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-plooy-elevated ${className}`}>
        <img src={resolveMediaUrl(avatar)} alt={name} className={imageClassName} />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-plooy-elevated ${emojiClassName} ${className}`}
    >
      {avatar}
    </div>
  )
}
