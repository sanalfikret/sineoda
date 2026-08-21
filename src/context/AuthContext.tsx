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

interface AuthContextValue {
  user: User | null
  activeProfile: Profile | null
  isLoading: boolean
  isAdmin: boolean
  isCreator: boolean
  login: (email: string, password: string, options?: { requireAdmin?: boolean }) => Promise<void>
  signup: (
    name: string,
    email: string,
    password: string,
    phone: string,
    smsCode: string,
  ) => Promise<{ message: string; email: string; devVerifyUrl?: string }>
  creatorLogin: (email: string, password: string) => Promise<void>
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

  const syncProfile = useCallback((nextUser: User) => {
    const savedProfileId = getProfileId()
    if (!savedProfileId) {
      setActiveProfile(null)
      return
    }
    const profile = nextUser.profiles.find((entry) => entry.id === savedProfileId) ?? null
    setActiveProfile(profile)
    if (!profile) setProfileId(null)
  }, [])

  useEffect(() => {
    if (activeProfile && !getProfileId()) {
      setProfileId(activeProfile.id)
    }
  }, [activeProfile])

  useEffect(() => {
    const init = async () => {
      if (!getToken()) {
        setIsLoading(false)
        return
      }

      try {
        const { user: me } = await fetchMe()
        setUser(me)
        syncProfile(me)
      } catch {
        setToken(null)
        setProfileId(null)
        setUser(null)
        setActiveProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [syncProfile])

  const login = useCallback(
    async (email: string, password: string, options?: { requireAdmin?: boolean }) => {
      const { token, user: loggedInUser } = await loginRequest(email, password, options?.requireAdmin)
      setToken(token)
      setUser(loggedInUser)
      setProfileId(null)
      setActiveProfile(null)
    },
    [],
  )

  const signup = useCallback(async (name: string, email: string, password: string, phone: string, smsCode: string) => {
    return signupRequest(name, email, password, phone, smsCode)
  }, [])

  const creatorLogin = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await creatorLoginRequest(email, password)
    setToken(token)
    setUser(loggedInUser)
    setProfileId(null)
    setActiveProfile(null)
  }, [])

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
      studentIdFileUrl?: string
    }) => {
      const { token, user: newUser } = await creatorSignupRequest(data)
      setToken(token)
      setUser(newUser)
      setProfileId(null)
      setActiveProfile(null)
    },
    [],
  )

  const logout = useCallback(() => {
    setToken(null)
    setProfileId(null)
    setUser(null)
    setActiveProfile(null)
  }, [])

  const clearActiveProfile = useCallback(() => {
    setProfileId(null)
    setActiveProfile(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const { user: me } = await fetchMe()
    setUser(me)
    syncProfile(me)
  }, [syncProfile])

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
      setUser(updatedUser)
    },
    [],
  )

  const updateAccount = useCallback(async (name: string) => {
    const { user: updatedUser } = await updateAccountRequest(name)
    setUser(updatedUser)
    syncProfile(updatedUser)
  }, [syncProfile])

  const updateProfile = useCallback(
    async (profileId: string, data: { name?: string; avatar?: string; isKids?: boolean }) => {
      const { user: updatedUser } = await updateProfileRequest(profileId, data)
      setUser(updatedUser)
      if (activeProfile?.id === profileId) {
        const nextProfile = updatedUser.profiles.find((entry) => entry.id === profileId) ?? null
        setActiveProfile(nextProfile)
      }
    },
    [activeProfile?.id],
  )

  const deleteProfile = useCallback(
    async (profileId: string) => {
      const { user: updatedUser } = await deleteProfileRequest(profileId)
      setUser(updatedUser)
      if (activeProfile?.id === profileId) {
        setActiveProfile(null)
        setProfileId(null)
      }
    },
    [activeProfile?.id],
  )

  const isAdmin = user?.role === 'admin'
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
