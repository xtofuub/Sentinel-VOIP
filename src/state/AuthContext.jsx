import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

const AuthContext = createContext(null)
const authNextKey = "sentinel-auth-next"

const profileColumns = "id,email,display_name,avatar_url,role,credits,is_suspended,created_at"

const userFallbackProfile = (user) => ({
  id: user.id,
  email: user.email || "",
  display_name: user.user_metadata?.full_name || user.user_metadata?.name || "Sentinel operator",
  avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
  role: "user",
  credits: 0,
  is_suspended: false,
  created_at: user.created_at,
})

const safeNextPath = (value, fallback = "/new") => (
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback
)

export function AuthProvider({ children }) {
  const userRef = useRef(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState("")

  const refreshProfile = useCallback(async (userOverride) => {
    const currentUser = userOverride || userRef.current

    if (!currentUser || !supabase) {
      setProfile(null)
      setProfileLoading(false)
      return null
    }

    setProfileLoading(true)
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select(profileColumns)
      .eq("id", currentUser.id)
      .maybeSingle()

    if (profileError) {
      setProfile(userFallbackProfile(currentUser))
      setError("Your account details could not be refreshed.")
      setProfileLoading(false)
      return null
    }

    const nextProfile = data || userFallbackProfile(currentUser)
    setProfile(nextProfile)
    setError("")
    setProfileLoading(false)
    return nextProfile
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      userRef.current = data.session?.user || null
      setSession(data.session)
      setError(sessionError?.message || "")
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      userRef.current = nextSession?.user || null
      setSession((currentSession) => (
        currentSession?.access_token === nextSession?.access_token
        && currentSession?.user?.id === nextSession?.user?.id
          ? currentSession
          : nextSession
      ))
      setLoading(false)
      if (!nextSession) setProfile(null)
    })

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id || null

  useEffect(() => {
    if (loading) return
    if (!userId || !userRef.current) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    void refreshProfile(userRef.current)
  }, [loading, refreshProfile, userId])

  const signInWithGoogle = useCallback(async (nextPath = "/new") => {
    if (!supabase) throw new Error("Supabase is not configured.")

    const next = safeNextPath(nextPath)
    try {
      window.sessionStorage.setItem(authNextKey, next)
    } catch {
      // The callback still has a safe default when storage is unavailable.
    }

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signInError) throw signInError
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError
    setProfile(null)
  }, [])

  const consumeAuthNext = useCallback(() => {
    let next = "/new"
    try {
      next = safeNextPath(window.sessionStorage.getItem(authNextKey))
      window.sessionStorage.removeItem(authNextKey)
    } catch {
      // Use the default destination.
    }
    return next
  }, [])

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    consumeAuthNext,
    error,
    isAdmin: profile?.role === "admin",
    isSuspended: Boolean(profile?.is_suspended),
    loading,
    profile,
    profileLoading,
    refreshProfile,
    session,
    signInWithGoogle,
    signOut,
    user: session?.user || null,
  }), [consumeAuthNext, error, loading, profile, profileLoading, refreshProfile, session, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
