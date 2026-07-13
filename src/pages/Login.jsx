import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, CircleAlert, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/state/AuthContext"

const getSafeNext = (value) => (
  value?.startsWith("/") && !value.startsWith("//") ? value : "/new"
)

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.4-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 3 7.5l3.4 2.6c.8-2.4 3-4.2 5.6-4.2Z" />
    </svg>
  )
}

export function Login() {
  const { configured, consumeAuthNext, loading, signInWithGoogle, user } = useAuth()
  const [searchParams] = useSearchParams()
  const { hash, pathname, search } = useLocation()
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState("")
  const isCallback = pathname === "/auth/callback"
  const requestedNext = getSafeNext(searchParams.get("next"))

  const callbackError = useMemo(() => {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""))
    const queryParams = new URLSearchParams(search)
    return queryParams.get("error_description") || hashParams.get("error_description") || ""
  }, [hash, search])

  useEffect(() => {
    if (loading || !user) return
    navigate(isCallback ? consumeAuthNext() : requestedNext, { replace: true })
  }, [consumeAuthNext, isCallback, loading, navigate, requestedNext, user])

  const handleGoogleSignIn = async () => {
    setSigningIn(true)
    setSignInError("")
    try {
      await signInWithGoogle(requestedNext)
    } catch (error) {
      setSignInError(error?.message || "Google sign-in could not be started.")
      setSigningIn(false)
    }
  }

  const visibleError = callbackError || signInError

  return (
    <main className="page product-page auth-page">
      <section className="auth-intro" aria-labelledby="auth-heading">
        <p className="eyebrow">Secure access</p>
        <h1 id="auth-heading">
          Your calls.
          <br />
          <em>Your history.</em>
        </h1>
        <p>
          Sign in once to keep call access, account balance, and returned recordings connected to you.
        </p>
        <div className="auth-proof" aria-label="Account benefits">
          <span><Check size={14} aria-hidden="true" />3 starter calls</span>
          <span><Check size={14} aria-hidden="true" />Private activity</span>
          <span><Check size={14} aria-hidden="true" />One Google account</span>
        </div>
      </section>

      <section className="surface auth-card" aria-labelledby="auth-card-heading">
        <div className="auth-card__mark" aria-hidden="true"><LockKeyhole size={22} /></div>
        <p className="eyebrow">Sentinel account</p>
        <h2 id="auth-card-heading">Continue to the console</h2>
        <p className="auth-card__copy">
          Google provides your name, email, and profile photo. Sentinel never receives your Google password.
        </p>

        {isCallback && !visibleError ? (
          <div className="auth-callback" role="status">
            <LoaderCircle className="spin" size={20} aria-hidden="true" />
            <span><strong>Finishing sign in</strong><small>Securing your workspace...</small></span>
          </div>
        ) : (
          <button
            className="button auth-google-button"
            type="button"
            disabled={!configured || signingIn || loading}
            onClick={handleGoogleSignIn}
          >
            {signingIn ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <GoogleMark />}
            {signingIn ? "Opening Google" : "Continue with Google"}
            {!signingIn && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        )}

        {!configured && (
          <div className="notice notice--warning auth-notice" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <p>Supabase environment variables are missing from this deployment.</p>
          </div>
        )}

        {visibleError && (
          <div className="notice notice--error auth-notice" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <p>{visibleError}</p>
          </div>
        )}

        <div className="auth-card__trust">
          <ShieldCheck size={16} aria-hidden="true" />
          <p><strong>Protected by Supabase Auth</strong><span>Your session stays encrypted and can be revoked at any time.</span></p>
        </div>
        <Link className="auth-card__back" to="/library">Browse scenarios without signing in <ArrowRight size={14} aria-hidden="true" /></Link>
      </section>
    </main>
  )
}
