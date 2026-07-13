import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CircleAlert, LoaderCircle } from "lucide-react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { GoogleMark } from "@/components/GoogleMark"
import { useAuth } from "@/state/AuthContext"

const getSafeNext = (value) => (
  value?.startsWith("/") && !value.startsWith("//") ? value : "/new"
)

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
    <main className="page auth-page">
      <section className="auth-panel" aria-labelledby="auth-heading">
        <Link className="auth-panel__brand" to="/" aria-label="Sentinel home">
          <span aria-hidden="true">S</span>
          Sentinel VOIP
        </Link>

        <div className="auth-panel__body">
          <p className="eyebrow">Account</p>
          <h1 id="auth-heading">Sign in to place calls</h1>
          <p className="auth-panel__copy">
            Browse the catalog and activity without an account. Sign in only when you are ready to send a call.
          </p>

          {isCallback && !visibleError ? (
            <div className="auth-callback" role="status">
              <LoaderCircle className="spin" size={20} aria-hidden="true" />
              <span><strong>Finishing sign in</strong><small>This should only take a moment.</small></span>
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
            </button>
          )}

          {!configured && (
            <div className="notice notice--warning auth-notice" role="alert">
              <CircleAlert size={17} aria-hidden="true" />
              <p>Sign-in is not configured for this deployment.</p>
            </div>
          )}

          {visibleError && (
            <div className="notice notice--error auth-notice" role="alert">
              <CircleAlert size={17} aria-hidden="true" />
              <p>{visibleError}</p>
            </div>
          )}

          <p className="auth-panel__fineprint">
            New accounts include 3 calls. Google never shares your password with Sentinel.
          </p>
        </div>

        <Link className="auth-panel__back" to="/library">
          <ArrowLeft size={14} aria-hidden="true" /> Back to browsing
        </Link>
      </section>
    </main>
  )
}
