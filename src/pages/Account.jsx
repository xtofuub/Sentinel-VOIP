import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CalendarDays, CircleAlert, Clock3, LogOut, PhoneCall, ShieldCheck, Sparkles } from "@/components/icons"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/state/AuthContext"

const formatDate = (value) => {
  if (!value) return "Not set"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
}

const formatLedgerReason = (reason) => {
  if (reason === "Starter calls") return "Starter access"
  if (reason === "Call session reserved") return "Call launched"
  return reason
}

export function Account() {
  const { isAdmin, isSuspended, profile, refreshProfile, signOut, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [ledger, setLedger] = useState([])
  const [ledgerLoading, setLedgerLoading] = useState(true)
  const [ledgerError, setLedgerError] = useState("")
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user || !supabase) return undefined
    let active = true

    const loadLedger = async () => {
      setLedgerLoading(true)
      const { data, error } = await supabase
        .from("credit_ledger")
        .select("id,delta,balance_after,reason,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8)

      if (!active) return
      setLedger(data || [])
      setLedgerError(error ? "Call history could not be loaded." : "")
      setLedgerLoading(false)
    }

    void loadLedger()
    void refreshProfile()
    return () => { active = false }
  }, [refreshProfile, user])

  const usage = useMemo(() => ({
    added: ledger.filter((entry) => entry.delta > 0).reduce((total, entry) => total + entry.delta, 0),
    used: Math.abs(ledger.filter((entry) => entry.delta < 0).reduce((total, entry) => total + entry.delta, 0)),
  }), [ledger])

  const displayName = profile?.display_name || user?.user_metadata?.full_name || "Sentinel operator"
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const initials = displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate("/", { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="page product-page account-page">
      <header className="product-hero product-hero--compact account-hero">
        <div className="product-hero__copy">
          <p className="eyebrow">Your account</p>
          <h1>Your calls.<br /><em>Your account.</em></h1>
          <p>See the Google account connected to Sentinel and understand every change to your call balance.</p>
        </div>
        <div className="product-hero__meta" aria-label="Account access">
          <span>{isAdmin ? "Access level" : "Calls remaining"}</span>
          <strong>{isAdmin ? "∞" : profile?.credits ?? 0}</strong>
          <small>{isAdmin ? "administrator" : "available now"}</small>
        </div>
      </header>

      {(isSuspended || location.state?.suspended) && (
        <div className="notice notice--error account-alert" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <p><strong>Account suspended</strong><span>New calls are unavailable. Contact an administrator for help.</span></p>
        </div>
      )}
      {location.state?.denied && (
        <div className="notice notice--warning account-alert" role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <p><strong>Admin access required</strong><span>Your account does not have permission to open that page.</span></p>
        </div>
      )}

      <section className="account-layout">
        <div className="surface account-profile">
          <header className="surface-heading account-section-heading">
            <span className="surface-index">01</span>
            <div><p className="eyebrow">Identity</p><h2>Connected account</h2></div>
          </header>
          <div className="account-profile__identity">
            <span className="account-avatar account-avatar--profile" aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : initials}
            </span>
            <div><h3>{displayName}</h3><p>{user.email}</p></div>
            <span className={`badge ${isSuspended ? "badge--failed" : "badge--live"}`}>
              <span className="badge__dot" aria-hidden="true" />{isSuspended ? "Suspended" : "Active"}
            </span>
          </div>
          <dl className="account-profile__details">
            <div><dt>Role</dt><dd>{isAdmin ? "Administrator" : "Member"}</dd></div>
            <div><dt>Joined</dt><dd>{formatDate(profile?.created_at || user.created_at)}</dd></div>
            <div><dt>Provider</dt><dd>Google</dd></div>
          </dl>
          <div className="account-profile__actions">
            {!isSuspended && <Link className="button button--primary" to="/new"><PhoneCall size={16} aria-hidden="true" />Start a call</Link>}
            {isAdmin && <Link className="button button--outline" to="/admin"><ShieldCheck size={16} aria-hidden="true" />Admin panel</Link>}
            <button className="button button--quiet" type="button" disabled={signingOut} onClick={handleSignOut}>
              <LogOut size={16} aria-hidden="true" />{signingOut ? "Signing out" : "Sign out"}
            </button>
          </div>
        </div>

        <div className="surface account-balance">
          <header className="surface-heading account-section-heading">
            <span className="surface-index">02</span>
            <div><p className="eyebrow">Call access</p><h2>Balance</h2></div>
          </header>
          <div className="account-balance__value">
            <span>{isAdmin ? "Unlimited" : profile?.credits ?? 0}</span>
            <p>{isAdmin ? "Admin calls never consume credits." : "calls available"}</p>
          </div>
          <div className="account-balance__metrics">
            <div><Sparkles size={16} aria-hidden="true" /><span><small>Added</small><strong>{usage.added}</strong></span></div>
            <div><PhoneCall size={16} aria-hidden="true" /><span><small>Used</small><strong>{usage.used}</strong></span></div>
          </div>
          {!isAdmin && (profile?.credits ?? 0) === 0 && (
            <div className="notice notice--warning account-balance__notice">
              <CircleAlert size={17} aria-hidden="true" />
              <p>Ask an administrator to add more calls to your account.</p>
            </div>
          )}
        </div>
      </section>

      <section className="surface account-ledger" aria-labelledby="account-ledger-heading">
        <header className="surface-heading account-section-heading">
          <span className="surface-index">03</span>
          <div><p className="eyebrow">Audit trail</p><h2 id="account-ledger-heading">Balance activity</h2></div>
        </header>

        {ledgerLoading ? (
          <div className="account-ledger__state" role="status"><span className="loader" aria-hidden="true" />Loading activity</div>
        ) : ledgerError ? (
          <div className="account-ledger__state is-error"><CircleAlert size={18} aria-hidden="true" />{ledgerError}</div>
        ) : ledger.length ? (
          <div className="account-ledger__list">
            {ledger.map((entry) => (
              <article className="account-ledger__entry" key={entry.id}>
                <span className={`account-ledger__icon${entry.delta > 0 ? " is-positive" : ""}`} aria-hidden="true">
                  {entry.delta > 0 ? <Sparkles size={16} /> : <PhoneCall size={16} />}
                </span>
                <div><strong>{formatLedgerReason(entry.reason)}</strong><small><CalendarDays size={12} aria-hidden="true" />{formatDate(entry.created_at)}</small></div>
                <span className={entry.delta > 0 ? "is-positive" : "is-negative"}>{entry.delta > 0 ? "+" : ""}{entry.delta}</span>
                <small>{entry.balance_after} after</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-ledger__state"><Clock3 size={18} aria-hidden="true" />Balance activity will appear here.</div>
        )}
        <Link className="account-ledger__activity-link" to="/activity">Open call activity <ArrowRight size={15} aria-hidden="true" /></Link>
      </section>
    </main>
  )
}
