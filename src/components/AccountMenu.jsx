import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowUpRight, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/state/AuthContext"

const getInitials = (name, email) => {
  const source = name?.trim() || email?.split("@")[0] || "S"
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

export function AccountMenu({ mobile = false }) {
  const { isAdmin, loading, profile, signOut, user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const displayName = profile?.display_name || user?.user_metadata?.full_name || user?.email || "Account"
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const initials = useMemo(() => getInitials(displayName, user?.email), [displayName, user?.email])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  if (loading) return <span className={`account-menu-skeleton${mobile ? " is-mobile" : ""}`} aria-hidden="true" />

  if (!user) {
    return (
      <Link
        className={mobile ? "mobile-auth-link" : "nav-auth-link"}
        to={`/login?next=${encodeURIComponent(pathname === "/" ? "/new" : pathname)}`}
      >
        Sign in
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    )
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate("/", { replace: true })
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  if (mobile) {
    return (
      <div className="mobile-account">
        <div className="mobile-account__identity">
          <span className="account-avatar" aria-hidden="true">
            {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}
          </span>
          <span><strong>{displayName}</strong><small>{isAdmin ? "Unlimited access" : `${profile?.credits ?? 0} calls left`}</small></span>
        </div>
        <Link className="mobile-nav-link" to="/account">Account <Settings size={15} aria-hidden="true" /></Link>
        {isAdmin && <Link className="mobile-nav-link" to="/admin">Admin <ShieldCheck size={15} aria-hidden="true" /></Link>}
        <button className="mobile-nav-link mobile-account__signout" type="button" disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? "Signing out" : "Sign out"}<LogOut size={15} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        className="account-trigger"
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-trigger__credits">{isAdmin ? "Unlimited" : `${profile?.credits ?? 0} left`}</span>
        <span className="account-avatar" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}
        </span>
      </button>

      {open && (
        <div className="account-popover" role="menu">
          <div className="account-popover__identity">
            <span className="account-avatar account-avatar--large" aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}
            </span>
            <span><strong>{displayName}</strong><small>{user.email}</small></span>
          </div>
          <div className="account-popover__balance">
            <span>{isAdmin ? "Admin access" : "Available calls"}</span>
            <strong>{isAdmin ? "Unlimited" : profile?.credits ?? 0}</strong>
          </div>
          <div className="account-popover__links">
            <Link role="menuitem" to="/account"><UserRound size={15} aria-hidden="true" />Account</Link>
            {isAdmin && <Link role="menuitem" to="/admin"><ShieldCheck size={15} aria-hidden="true" />Admin panel</Link>}
            <button role="menuitem" type="button" disabled={signingOut} onClick={handleSignOut}>
              <LogOut size={15} aria-hidden="true" />{signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
