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
  clearAuthStorage,
  fetchMe,
  getProfileId,
  getToken,
  loginRequest,
  setProfileId,
  setToken,
  signupRequest,
  updateAccountRequest,
  updateProfileRequest,
} from '../api/client'
import type { Profile, User } from '../types/auth'
import {
  cacheAuthUser,
  readCachedAuthUser,
  sleep,
} from '../utils/authSession'

interface AuthContextValue {
  user: User | null
  activeProfile: Profile | null
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
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    clearAuthStorage()
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
    const { user: me, token: refreshedToken } = await fetchMe()
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

      setIsLoading(false)
    }

    void init()
  }, [syncAuthSession, applyUser])

  useEffect(() => {
    const onAuthCleared = () => clearSession()
    window.addEventListener('plooy-auth-cleared', onAuthCleared)
    return () => window.removeEventListener('plooy-auth-cleared', onAuthCleared)
  }, [clearSession])

  useEffect(() => {
    if (!getToken()) return

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void syncAuthSession().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [syncAuthSession])

  const login = useCallback(
    async (email: string, password: string, options?: { requireAdmin?: boolean }) => {
      const { token, user: loggedInUser } = await loginRequest(email, password, options?.requireAdmin)
      setToken(token)
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
    setToken(token)
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
      setToken(token)
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
    [user, activeProfile, isLoading, isAdmin, isCreator, login, signup, creatorLogin, creatorSignup, logout, clearActiveProfile, refreshUser, selectProfile, addProfile, updateAccount, updateProfile, deleteProfile],
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
