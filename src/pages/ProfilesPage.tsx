import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PROFILE_AVATARS } from '../types/auth'

export function ProfilesPage() {
  const { user, selectProfile, addProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState<string>(PROFILE_AVATARS[0])

  if (!user) return null

  const handleSelect = (profileId: string) => {
    selectProfile(profileId)
    navigate('/', { replace: true })
  }

  const handleAddProfile = async () => {
    if (!newName.trim()) return
    await addProfile(newName, newAvatar)
    setNewName('')
    setNewAvatar(PROFILE_AVATARS[0])
    setShowAddForm(false)
  }

  return (
    <div className="min-h-dvh bg-sineoda-bg px-4 py-8 sm:px-6">
      <div className="safe-top mx-auto max-w-4xl text-center">
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Kim izliyor?</h1>
        <p className="mt-2 text-sm text-sineoda-muted sm:text-base">
          Profilini seç veya yeni bir profil ekle
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-8">
          {user.profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelect(profile.id)}
              className="group flex w-[120px] flex-col items-center gap-3 sm:w-[140px]"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-transparent bg-sineoda-elevated text-4xl transition group-hover:border-sineoda-gold group-hover:scale-105 sm:h-28 sm:w-28 sm:text-5xl">
                {profile.avatar}
              </div>
              <span className="text-sm font-medium text-white/80 transition group-hover:text-white sm:text-base">
                {profile.name}
              </span>
              {profile.isKids && (
                <span className="-mt-2 text-xs text-sineoda-blue">Çocuk profili</span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="group flex w-[120px] flex-col items-center gap-3 sm:w-[140px]"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 text-3xl text-white/40 transition group-hover:border-sineoda-gold group-hover:text-sineoda-gold sm:h-28 sm:w-28">
              +
            </div>
            <span className="text-sm font-medium text-white/60 transition group-hover:text-white sm:text-base">
              Profil Ekle
            </span>
          </button>
        </div>

        {showAddForm && (
          <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-sineoda-surface p-5 text-left">
            <h2 className="font-semibold text-white">Yeni profil</h2>
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Profil adı"
              className="mt-3 w-full rounded-lg border border-white/10 bg-sineoda-bg px-4 py-2.5 text-white outline-none focus:border-sineoda-gold"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {PROFILE_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setNewAvatar(avatar)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition ${
                    newAvatar === avatar
                      ? 'bg-sineoda-gold/20 ring-2 ring-sineoda-gold'
                      : 'bg-sineoda-bg hover:bg-white/5'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddProfile()}
                className="flex-1 rounded-lg bg-sineoda-gold py-2.5 text-sm font-semibold text-sineoda-bg"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-4 py-2.5 text-sm text-sineoda-muted hover:text-white"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-12 text-sm text-sineoda-muted transition hover:text-white"
        >
          Hesaptan çıkış yap
        </button>
      </div>
    </div>
  )
}
