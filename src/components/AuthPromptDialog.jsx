import { useEffect, useRef, useState } from "react"
import { CircleAlert, LoaderCircle, X } from "@/components/icons"
import { GoogleMark } from "@/components/GoogleMark"
import { useAuth } from "@/state/AuthContext"

export function AuthPromptDialog({ open, onClose }) {
  const { configured, loading, signInWithGoogle } = useAuth()
  const dialogRef = useRef(null)
  const signInButtonRef = useRef(null)
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    signInButtonRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !signingIn) {
        onClose()
        return
      }

      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ))
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [onClose, open, signingIn])

  if (!open) return null

  const handleSignIn = async () => {
    setSigningIn(true)
    setError("")
    try {
      await signInWithGoogle("/new")
    } catch (signInError) {
      setError(signInError?.message || "Google sign-in could not be started.")
      setSigningIn(false)
    }
  }

  return (
    <div className="auth-prompt-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !signingIn) onClose()
    }}>
      <section
        className="auth-prompt"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
      >
        <header>
          <div>
            <p className="eyebrow">One last step</p>
            <h2 id="auth-prompt-title">Sign in to place this call</h2>
          </div>
          <button type="button" onClick={onClose} disabled={signingIn} aria-label="Close sign-in dialog">
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        <p className="auth-prompt__copy">
          Browsing stays open. An account is only required when you send a call.
        </p>

        <button
          className="button auth-google-button"
          ref={signInButtonRef}
          type="button"
          disabled={!configured || signingIn || loading}
          onClick={handleSignIn}
        >
          {signingIn ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <GoogleMark />}
          {signingIn ? "Opening Google" : "Continue with Google"}
        </button>

        {!configured && (
          <div className="notice notice--warning auth-notice" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <p>Sign-in is not configured for this deployment.</p>
          </div>
        )}

        {error && (
          <div className="notice notice--error auth-notice" role="alert">
            <CircleAlert size={17} aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <small>New accounts include 3 calls. Google never shares your password with Sentinel.</small>
      </section>
    </div>
  )
}
