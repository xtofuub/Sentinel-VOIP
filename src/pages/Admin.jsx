import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CircleAlert, Coins, LoaderCircle, Search, ShieldCheck, UserRoundCheck, UsersRound, X } from "@/components/icons"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/state/AuthContext"

const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))

const initialsFor = (profile) => {
  const source = profile.display_name || profile.email || "S"
  return source.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

export function Admin() {
  const { refreshProfile, user } = useAuth()
  const reasonRef = useRef(null)
  const [profiles, setProfiles] = useState([])
  const [sessionCount, setSessionCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState(null)
  const [delta, setDelta] = useState(3)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState("")
  const [notice, setNotice] = useState("")

  const loadAdminData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setLoadError("")

    const [profilesResult, sessionsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,avatar_url,role,credits,is_suspended,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("call_sessions").select("id", { count: "exact", head: true }),
    ])

    if (profilesResult.error) {
      setLoadError("Accounts could not be loaded. Check administrator permissions.")
      setProfiles([])
    } else {
      setProfiles(profilesResult.data || [])
    }
    setSessionCount(sessionsResult.count || 0)
    setLoading(false)
  }, [])

  useEffect(() => { void loadAdminData() }, [loadAdminData])

  useEffect(() => {
    if (!selected) return undefined
    reasonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) setSelected(null)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [saving, selected])

  const visibleProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return profiles.filter((profile) => {
      const matchesQuery = !normalized
        || profile.display_name?.toLowerCase().includes(normalized)
        || profile.email?.toLowerCase().includes(normalized)
      const matchesFilter = filter === "all"
        || (filter === "admin" && profile.role === "admin")
        || (filter === "member" && profile.role !== "admin" && !profile.is_suspended)
        || (filter === "suspended" && profile.is_suspended)
      return matchesQuery && matchesFilter
    })
  }, [filter, profiles, query])

  const metrics = useMemo(() => ({
    active: profiles.filter((profile) => !profile.is_suspended).length,
    calls: sessionCount,
    credits: profiles.filter((profile) => profile.role !== "admin").reduce((total, profile) => total + profile.credits, 0),
    total: profiles.length,
  }), [profiles, sessionCount])

  const openAdjustment = (profile) => {
    setSelected(profile)
    setDelta(3)
    setReason("")
    setDialogError("")
  }

  const adjustCredits = async (event) => {
    event.preventDefault()
    const amount = Number(delta)
    const cleanReason = reason.trim()
    if (!selected || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 1000 || !cleanReason || !supabase) return

    setSaving(true)
    setDialogError("")
    const { data, error } = await supabase.rpc("admin_adjust_credits", {
      p_delta: amount,
      p_idempotency_key: crypto.randomUUID(),
      p_reason: cleanReason,
      p_target_user_id: selected.id,
    })

    if (error) {
      setDialogError(error.message || "The balance could not be updated.")
      setSaving(false)
      return
    }

    const nextBalance = Number(data)
    setProfiles((current) => current.map((profile) => (
      profile.id === selected.id ? { ...profile, credits: nextBalance } : profile
    )))
    if (selected.id === user.id) void refreshProfile()
    setNotice(`${selected.display_name || selected.email} now has ${nextBalance} calls.`)
    setSelected(null)
    setSaving(false)
  }

  return (
    <main className="page product-page admin-page">
      <header className="product-hero product-hero--compact admin-hero">
        <div className="product-hero__copy">
          <p className="eyebrow">Administrator</p>
          <h1>Manage people.<br /><em>Control call access.</em></h1>
          <p>Review every Sentinel account and adjust call balances from one protected workspace.</p>
        </div>
        <div className="product-hero__meta" aria-label="Administrator access">
          <span>Access level</span><strong>∞</strong><small>unlimited calls</small>
        </div>
      </header>

      {notice && (
        <div className="notice notice-success admin-notice" role="status">
          <ShieldCheck size={18} aria-hidden="true" /><p>{notice}</p>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={15} /></button>
        </div>
      )}

      <section className="surface admin-hub" aria-labelledby="admin-users-heading">
        <header className="admin-hub__header">
          <div><p className="eyebrow">Workspace access</p><h2 id="admin-users-heading">Accounts</h2></div>
          <span className="badge badge--live"><span className="badge__dot" aria-hidden="true" />Admin session</span>
        </header>

        <div className="admin-metrics" aria-label="Account summary">
          <div><UsersRound size={17} aria-hidden="true" /><span><small>Total users</small><strong>{metrics.total}</strong></span></div>
          <div><UserRoundCheck size={17} aria-hidden="true" /><span><small>Active</small><strong>{metrics.active}</strong></span></div>
          <div><Coins size={17} aria-hidden="true" /><span><small>User credits</small><strong>{metrics.credits}</strong></span></div>
          <div><ShieldCheck size={17} aria-hidden="true" /><span><small>Call sessions</small><strong>{metrics.calls}</strong></span></div>
        </div>

        <div className="admin-toolbar">
          <label className="admin-search" htmlFor="admin-user-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Search accounts</span>
            <input id="admin-user-search" type="search" value={query} placeholder="Search name or email" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="admin-filters" role="group" aria-label="Filter accounts">
            {["all", "member", "admin", "suspended"].map((value) => (
              <button key={value} className="admin-filter" type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-state" role="status"><span className="loader" aria-hidden="true" />Loading accounts</div>
        ) : loadError ? (
          <div className="admin-state is-error"><CircleAlert size={19} aria-hidden="true" /><span>{loadError}</span><button className="button button--outline button--compact" type="button" onClick={() => void loadAdminData()}>Retry</button></div>
        ) : visibleProfiles.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="visually-hidden">Sentinel user accounts</caption>
              <thead><tr><th>User</th><th>Access</th><th>Calls left</th><th>Joined</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {visibleProfiles.map((profile) => (
                  <tr key={profile.id}>
                    <td><div className="admin-user"><span className="account-avatar" aria-hidden="true">{profile.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : initialsFor(profile)}</span><span><strong>{profile.display_name || "Unnamed member"}</strong><small>{profile.email}</small></span></div></td>
                    <td><span className={`badge ${profile.is_suspended ? "badge--failed" : profile.role === "admin" ? "badge--live" : "badge--neutral"}`}><span className="badge__dot" aria-hidden="true" />{profile.is_suspended ? "Suspended" : profile.role}</span></td>
                    <td><strong className="admin-table__credits">{profile.role === "admin" ? "∞" : profile.credits}</strong></td>
                    <td><time dateTime={profile.created_at}>{formatDate(profile.created_at)}</time></td>
                    <td><button className="button button--outline button--compact" type="button" disabled={profile.role === "admin"} onClick={() => openAdjustment(profile)}>Adjust calls</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-state"><UsersRound size={20} aria-hidden="true" /><span>No accounts match this view.</span><button className="button button--quiet button--compact" type="button" onClick={() => { setQuery(""); setFilter("all") }}>Clear filters</button></div>
        )}
      </section>

      {selected && (
        <div className="admin-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null) }}>
          <form className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby="adjust-credits-heading" onSubmit={adjustCredits}>
            <header><div><p className="eyebrow">Call access</p><h2 id="adjust-credits-heading">Adjust balance</h2></div><button type="button" aria-label="Close dialog" disabled={saving} onClick={() => setSelected(null)}><X size={18} /></button></header>
            <div className="admin-dialog__user"><span>{selected.display_name || selected.email}</span><strong>{selected.credits} calls now</strong></div>
            <label className="field" htmlFor="credit-delta"><span>Calls to add or remove</span><input id="credit-delta" type="number" min="-1000" max="1000" step="1" value={delta} onChange={(event) => setDelta(event.target.value)} /></label>
            <label className="field" htmlFor="credit-reason"><span>Reason</span><input ref={reasonRef} id="credit-reason" type="text" maxLength="240" value={reason} placeholder="Example: Support adjustment" onChange={(event) => setReason(event.target.value)} /></label>
            {dialogError && <div className="notice notice--error admin-dialog__error" role="alert"><CircleAlert size={16} aria-hidden="true" /><p>{dialogError}</p></div>}
            <footer><button className="button button--quiet" type="button" disabled={saving} onClick={() => setSelected(null)}>Cancel</button><button className="button button--primary" type="submit" disabled={saving || !reason.trim() || Number(delta) === 0}>{saving && <LoaderCircle className="spin" size={16} aria-hidden="true" />}{saving ? "Updating" : "Update balance"}</button></footer>
          </form>
        </div>
      )}
    </main>
  )
}
