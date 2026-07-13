import { Fragment, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CircleAlert, LoaderCircle } from "lucide-react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { GoogleMark } from "@/components/GoogleMark"
import { useAuth } from "@/state/AuthContext"

const getSafeNext = (value) => (
  value?.startsWith("/") && !value.startsWith("//") ? value : "/new"
)

const authStatement = "Choose the setup.\nKeep the reaction."

function Typewriter({ text }) {
  const [displayText, setDisplayText] = useState(() => (
    document.documentElement.dataset.motion === "reduced" ? text : ""
  ))

  useEffect(() => {
    if (displayText === text || document.documentElement.dataset.motion === "reduced") return undefined

    const timeout = window.setTimeout(() => {
      setDisplayText(text.slice(0, displayText.length + 1))
    }, 36)

    return () => window.clearTimeout(timeout)
  }, [displayText, text])

  return (
    <>
      {displayText.split("\n").map((line, index) => (
        <Fragment key={`auth-line-${index}`}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
      {displayText !== text && <span className="auth-typewriter__cursor" />}
    </>
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
    <main className="page auth-page">
      <section className="auth-fuse" aria-labelledby="auth-heading">
        <div className="auth-fuse__form-panel">
          <div className="auth-panel__body">
            <h1 id="auth-heading">Sign in to Sentinel.</h1>
            <p className="auth-panel__copy">
              Save your calls, recordings, and remaining credits to one account.
            </p>

            {isCallback && !visibleError ? (
              <div className="auth-callback" role="status">
                <LoaderCircle className="spin" size={20} aria-hidden="true" />
                <span><strong>Finishing sign in</strong><small>Returning you to the workspace.</small></span>
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

            <p className="auth-panel__included">New accounts include 3 free calls. No card required.</p>

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

            <p className="auth-panel__fineprint">Sentinel never receives your Google password.</p>
          </div>

          <Link className="auth-panel__back" to="/library">
            <ArrowLeft size={14} aria-hidden="true" /> Back to browsing
          </Link>
        </div>

        <aside className="auth-fuse__visual" aria-label="Sentinel prank call workspace">
          <img className="auth-fuse__atmosphere" src="/visuals/atmosphere.png" alt="" aria-hidden="true" />
          <img className="auth-fuse__hand" src="/visuals/hand-right.png" alt="" aria-hidden="true" />
          <p className="auth-fuse__statement" aria-hidden="true">
            <Typewriter text={authStatement} />
          </p>
        </aside>
      </section>
    </main>
  )
}
