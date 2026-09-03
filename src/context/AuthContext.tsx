import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createProfileRequest,
  creatorLoginRequest,
  creatorSignupRequest,
  deleteProfileRequest,
  AUTH_TOKEN_CHANGED_EVENT,
  clearAuthStorage,
  fetchMe,
  getProfileId,
  getToken,
  loginRequest,
  refreshSessionToken,
  setProfileId,
  setToken,
  signupRequest,
  updateAccountRequest,
  updateProfileRequest,
} from '../api/client'
import type { Profile, User } from '../types/auth'
import {
  cacheAuthUser,
  getAuthSessionEpoch,
  isAuthSessionCurrent,
  readCachedAuthUser,
  sleep,
} from '../utils/authSession'

interface AuthContextValue {
  user: User | null
  activeProfile: Profile | null
  sessionToken: string | null
  isLoading: boolean
  isAdmin: boolean
  isCreator: boolean
  login: (email: string, password: string, options?: { requireAdmin?: boolean }) => Promise<User>
  signup: (
    name: string,
    email: string,
    password: string,
    phone: string,
    smsCode: string,
    options?: {
      planId?: string
      studentIdUrl?: string
      acceptTerms?: boolean
      acceptPrivacy?: boolean
      acceptKvkk?: boolean
    },
  ) => Promise<{ message: string; email: string; planId?: string; devVerifyUrl?: string }>
  creatorLogin: (email: string, password: string) => Promise<User>
  creatorSignup: (data: {
    name: string
    email: string
    password: string
    studioName: string
    bio?: string
    acceptLegal: boolean
    program?: 'standard' | 'student_cinema'
    schoolId?: string
    phone?: string
    projectCrew?: string
    filmLink?: string
    studentIdFileUrl?: string
  }) => Promise<void>
  logout: () => void
  clearActiveProfile: () => void
  refreshUser: () => Promise<void>
  selectProfile: (profileId: string) => void
  addProfile: (name: string, avatar: string, isKids?: boolean) => Promise<void>
  updateAccount: (name: string) => Promise<void>
  updateProfile: (profileId: string, data: { name?: string; avatar?: string; isKids?: boolean }) => Promise<void>
  deleteProfile: (profileId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getToken() : null,
  )
  const [isLoading, setIsLoading] = useState(true)

  const syncSessionToken = useCallback(() => {
    const token = getToken()
    setSessionToken(token)
    if (!token) {
      setUser(null)
      setActiveProfile(null)
      cacheAuthUser(null)
    }
    return token
  }, [])

  const clearSession = useCallback(() => {
    clearAuthStorage()
    setSessionToken(null)
    setUser(null)
    setActiveProfile(null)
  }, [])

  const applyUser = useCallback(
    (nextUser: User) => {
      setUser(nextUser)
      cacheAuthUser(nextUser)
      const savedProfileId = getProfileId()
      if (!savedProfileId) {
        setActiveProfile(null)
        return
      }
      const profile = nextUser.profiles.find((entry) => entry.id === savedProfileId) ?? null
      setActiveProfile(profile)
      if (!profile) setProfileId(null)
    },
    [],
  )

  const syncAuthSession = useCallback(async () => {
    const epoch = getAuthSessionEpoch()
    if (!getToken()) return null
    const { user: me, token: refreshedToken } = await fetchMe()
    if (!isAuthSessionCurrent(epoch) || !getToken()) return null
    if (refreshedToken) setToken(refreshedToken)
    applyUser(me)
    return me
  }, [applyUser])

  useEffect(() => {
    if (activeProfile && !getProfileId()) {
      setProfileId(activeProfile.id)
    }
  }, [activeProfile])

  useEffect(() => {
    const init = async () => {
      const token = getToken()
      if (!token) {
        setIsLoading(false)
        return
      }

      const cached = readCachedAuthUser()
      if (cached) {
        applyUser(cached)
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await syncAuthSession()
          break
        } catch {
          if (attempt === 2) break
          await sleep(700 * (attempt + 1))
        }
      }

      syncSessionToken()
      setIsLoading(false)
    }

    void init()
  }, [syncAuthSession, applyUser])

  useEffect(() => {
    const onAuthCleared = () => {
      syncSessionToken()
    }
    const onTokenChanged = () => {
      syncSessionToken()
    }
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === 'plooy_token' ||
        event.key === 'sineoda_token' ||
        event.key === 'plooy_user_cache' ||
        event.key === 'sineoda_user_cache'
      ) {
        syncSessionToken()
      }
    }
    window.addEventListener('plooy-auth-cleared', onAuthCleared)
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTokenChanged)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('plooy-auth-cleared', onAuthCleared)
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTokenChanged)
      window.removeEventListener('storage', onStorage)
    }
  }, [syncSessionToken])

  useEffect(() => {
    if (!user) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (!getToken()) {
        syncSessionToken()
        return
      }
      void syncAuthSession().catch(() => undefined)
      void refreshSessionToken().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, syncAuthSession, syncSessionToken])

  const login = useCallback(
    async (email: string, password: string, options?: { requireAdmin?: boolean }) => {
      const { token, user: loggedInUser } = await loginRequest(email, password, options?.requireAdmin)
      if (!token?.trim()) {
        throw new Error('Sunucu oturum jetonu döndürmedi. Sayfayı yenileyip tekrar deneyin.')
      }
      setToken(token)
      setSessionToken(token)
      setProfileId(null)
      setActiveProfile(null)
      applyUser(loggedInUser)
      return loggedInUser
    },
    [applyUser],
  )

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      phone: string,
      smsCode: string,
      options?: {
        planId?: string
        studentIdUrl?: string
        acceptTerms?: boolean
        acceptPrivacy?: boolean
        acceptKvkk?: boolean
      },
    ) => {
      return signupRequest(name, email, password, phone, smsCode, options)
    },
    [],
  )

  const creatorLogin = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await creatorLoginRequest(email, password)
    if (!token?.trim()) {
      throw new Error('Sunucu oturum jetonu döndürmedi. Sayfayı yenileyip tekrar deneyin.')
    }
    setToken(token)
    setSessionToken(token)
    setProfileId(null)
    setActiveProfile(null)
    applyUser(loggedInUser)
    return loggedInUser
  }, [applyUser])

  const creatorSignup = useCallback(
    async (data: {
      name: string
      email: string
      password: string
      studioName: string
      bio?: string
      acceptLegal: boolean
      program?: 'standard' | 'student_cinema'
      schoolId?: string
      phone?: string
      projectCrew?: string
      filmLink?: string
      studentIdFileUrl?: string
    }) => {
      const { token, user: newUser } = await creatorSignupRequest(data)
      if (!token?.trim()) {
        throw new Error('Sunucu oturum jetonu döndürmedi. Sayfayı yenileyip tekrar deneyin.')
      }
      setToken(token)
      setSessionToken(token)
      setProfileId(null)
      setActiveProfile(null)
      applyUser(newUser)
    },
    [applyUser],
  )

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const clearActiveProfile = useCallback(() => {
    setProfileId(null)
    setActiveProfile(null)
  }, [])

  const refreshUser = useCallback(async () => {
    await syncAuthSession()
  }, [syncAuthSession])

  const selectProfile = useCallback(
    (profileId: string) => {
      if (!user) return
      const profile = user.profiles.find((entry) => entry.id === profileId)
      if (!profile) return
      setActiveProfile(profile)
      setProfileId(profileId)
    },
    [user],
  )

  const addProfile = useCallback(
    async (name: string, avatar: string, isKids = false) => {
      const { user: updatedUser } = await createProfileRequest(name, avatar, isKids)
      applyUser(updatedUser)
    },
    [applyUser],
  )

  const updateAccount = useCallback(async (name: string) => {
    const { user: updatedUser } = await updateAccountRequest(name)
    applyUser(updatedUser)
  }, [applyUser])

  const updateProfile = useCallback(
    async (profileId: string, data: { name?: string; avatar?: string; isKids?: boolean }) => {
      const { user: updatedUser } = await updateProfileRequest(profileId, data)
      applyUser(updatedUser)
      if (activeProfile?.id === profileId) {
        const nextProfile = updatedUser.profiles.find((entry) => entry.id === profileId) ?? null
        setActiveProfile(nextProfile)
      }
    },
    [activeProfile?.id, applyUser],
  )

  const deleteProfile = useCallback(
    async (profileId: string) => {
      const { user: updatedUser } = await deleteProfileRequest(profileId)
      applyUser(updatedUser)
      if (activeProfile?.id === profileId) {
        setActiveProfile(null)
        setProfileId(null)
      }
    },
    [activeProfile?.id, applyUser],
  )

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
  const isCreator = user?.role === 'creator'

  const value = useMemo(
    () => ({
      user,
      activeProfile,
      sessionToken,
      isLoading,
      isAdmin,
      isCreator,
      login,
      signup,
      creatorLogin,
      creatorSignup,
      logout,
      clearActiveProfile,
      refreshUser,
      selectProfile,
      addProfile,
      updateAccount,
      updateProfile,
      deleteProfile,
    }),
    [user, activeProfile, sessionToken, isLoading, isAdmin, isCreator, login, signup, creatorLogin, creatorSignup, logout, clearActiveProfile, refreshUser, selectProfile, addProfile, updateAccount, updateProfile, deleteProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
