import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  Headphones,
  RefreshCw,
  Search,
  Trash2,
  Waves,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { enrichRecordedCallsWithLocalInput, getRecordedCalls } from "@/services/api"

const ACTIVE_STATUSES = new Set(["pending", "queued", "running"])

const activityFilters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "recordings", label: "Recordings" },
  { id: "issues", label: "Issues" },
]

const readAccounts = () => {
  try {
    const value = JSON.parse(localStorage.getItem("activeAccounts") || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const formatTimestamp = (call) => {
  if (call.timeLabel) return call.timeLabel
  if (!call.timestamp) return "Unknown time"
  return new Date(call.timestamp * 1000).toLocaleString()
}

const formatStatus = (status) => {
  if (!status) return "Unknown"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const statusClassName = (status) => {
  const normalized = String(status || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "")
  return `badge badge--status badge--${normalized || "unknown"}`
}

export function Activity() {
  const navigate = useNavigate()
  const { scenarios } = useCatalog()
  const [accounts, setAccounts] = useState(readAccounts)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [allRequestsFailed, setAllRequestsFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const syncAccounts = () => setAccounts(readAccounts())
    window.addEventListener("focus", syncAccounts)
    window.addEventListener("storage", syncAccounts)
    return () => {
      window.removeEventListener("focus", syncAccounts)
      window.removeEventListener("storage", syncAccounts)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!accounts.length) {
      setCalls([])
      setAllRequestsFailed(false)
      return
    }

    setLoading(true)
    setError("")
    setAllRequestsFailed(false)
    const rows = []
    const failures = []
    let attemptedRequests = 0

    for (const account of accounts) {
      const did = account?.did || account?.uid
      if (!did) continue
      attemptedRequests += 1

      try {
        const accountCalls = await getRecordedCalls(account.country || "fi", did)
        rows.push(...accountCalls.map((call) => ({
          ...call,
          accountCountry: account.country || "fi",
          accountDid: did,
        })))
      } catch (requestError) {
        failures.push(requestError)
      }
    }

    const unique = Array.from(new Map(rows.map((call) => [
      `${call.uid || call.accountDid}:${call._id}`,
      call,
    ])).values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    setCalls(enrichRecordedCallsWithLocalInput(unique))
    setAllRequestsFailed(attemptedRequests > 0 && failures.length === attemptedRequests)
    if (failures.length) {
      setError(`${failures.length} backend request${failures.length === 1 ? "" : "s"} failed. See API logs for details.`)
    }
    setLoading(false)
  }, [accounts])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const running = calls.some((call) => ACTIVE_STATUSES.has(call.status))

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      void refresh()
    }, 20000)
    return () => window.clearInterval(interval)
  }, [refresh, running])

  const catalogByDial = useMemo(() => new Map(scenarios.map((scenario) => [
    `${scenario.countryCode}|${String(scenario._id)}`,
    scenario,
  ])), [scenarios])

  const catalogByTitle = useMemo(() => new Map(scenarios.map((scenario) => [
    scenario.titulo?.trim().toLowerCase(),
    scenario,
  ])), [scenarios])

  const resolvedCalls = useMemo(() => calls.map((call) => {
    const country = call.cou || call.accountCountry || "fi"
    const scenario = catalogByDial.get(`${country}|${String(call.dial || "")}`)
      || catalogByTitle.get(call.titulo?.trim().toLowerCase())

    return { call, scenario, country }
  }), [calls, catalogByDial, catalogByTitle])

  const activeCount = calls.filter((call) => ACTIVE_STATUSES.has(call.status)).length
  const recordingCount = calls.filter((call) => call.isPlayable).length
  const issueCount = calls.filter((call) => call.status === "declined").length

  const filteredCalls = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return resolvedCalls.filter(({ call }) => {
      const matchesQuery = !normalized
        || call.titulo?.toLowerCase().includes(normalized)
        || call.targetName?.toLowerCase().includes(normalized)
        || call.targetPhone?.toLowerCase().includes(normalized)

      const matchesFilter = filter === "all"
        || (filter === "active" && ACTIVE_STATUSES.has(call.status))
        || (filter === "recordings" && call.isPlayable)
        || (filter === "issues" && call.status === "declined")

      return matchesQuery && matchesFilter
    })
  }, [filter, query, resolvedCalls])

  return (
    <main className="page product-page activity-page">
      <header className="product-hero product-hero--compact">
        <div className="product-hero__index" aria-hidden="true">03</div>
        <div className="product-hero__copy">
          <p className="eyebrow">Activity command center</p>
          <h1>
            Every return.
            <br />
            <em>One clear record.</em>
          </h1>
          <p className="product-hero__description">
            Search recipients, track live tasks, and play returned recordings without leaving the workspace.
          </p>
        </div>
        <div className="product-hero__meta" aria-label="Activity state">
          <span>Current state</span>
          <strong>{activeCount}</strong>
          <small>active sessions</small>
        </div>
      </header>

      <section className="surface activity-hub" aria-labelledby="activity-results-heading">
        <header className="activity-hub__header">
          <div>
            <p className="eyebrow">Backend records</p>
            <h2 id="activity-results-heading">Latest activity</h2>
            <p>Records linked to identities created in this browser.</p>
          </div>
          <div className="activity-hub__actions">
            <span className={`badge ${running ? "badge--live" : "badge--neutral"}`}>
              <span className="badge__dot" aria-hidden="true" />
              {running ? "Live · 20 sec" : "Standing by"}
            </span>
            <button
              className="button button--primary"
              type="button"
              onClick={() => void refresh()}
              disabled={loading || !accounts.length}
            >
              <RefreshCw className={loading ? "is-spinning" : undefined} aria-hidden="true" size={16} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </header>

        <div className="activity-metrics" aria-label="Activity summary">
          <div><span>Identities</span><strong>{accounts.length.toLocaleString()}</strong></div>
          <div><span>Total records</span><strong>{calls.length.toLocaleString()}</strong></div>
          <div><span>Active</span><strong>{activeCount.toLocaleString()}</strong></div>
          <div><span>Recordings</span><strong>{recordingCount.toLocaleString()}</strong></div>
        </div>

        <div className="activity-toolbar">
          <label className="activity-search" htmlFor="activity-search">
            <span className="visually-hidden">Search activity</span>
            <Search aria-hidden="true" size={17} strokeWidth={1.5} />
            <input
              id="activity-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipient or scenario"
            />
          </label>

          <div className="activity-filters" role="group" aria-label="Filter activity">
            {activityFilters.map((item) => (
              <button
                key={item.id}
                className="activity-filter"
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
                {item.id === "active" && activeCount > 0 && <span>{activeCount}</span>}
                {item.id === "recordings" && recordingCount > 0 && <span>{recordingCount}</span>}
                {item.id === "issues" && issueCount > 0 && <span>{issueCount}</span>}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="notice notice--warning" role="status">
            <Waves aria-hidden="true" size={18} strokeWidth={1.5} />
            <div>
              <strong>{allRequestsFailed ? "Activity could not load" : "Some records are unavailable"}</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!accounts.length ? (
          <div className="empty-state activity-empty">
            <span className="empty-state__number" aria-hidden="true">00</span>
            <div>
              <h2>No backend identities</h2>
              <p>Create a session and its returned record will appear here.</p>
              <button className="button button--primary" type="button" onClick={() => navigate("/new")}>
                Create a session <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : loading && !calls.length ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-mark" aria-hidden="true" />
            <p>Requesting the latest records...</p>
          </div>
        ) : allRequestsFailed ? (
          <div className="empty-state activity-empty">
            <span className="empty-state__number" aria-hidden="true">!</span>
            <div>
              <h2>Backend records unavailable</h2>
              <p>The saved identities are intact. Retry when the service is reachable.</p>
              <button className="button button--outline" type="button" onClick={() => void refresh()}>
                Retry activity
              </button>
            </div>
          </div>
        ) : filteredCalls.length ? (
          <div className="activity-records">
            {filteredCalls.map(({ call, scenario, country }) => {
              const rowKey = `${call.uid || call.accountDid}:${call._id}`
              const title = call.titulo || scenario?.titulo || "Untitled scenario"
              const thumbnail = call.pic || scenario?.image_url

              return (
                <article className="activity-record" key={rowKey}>
                  <ScenarioThumbnail src={thumbnail} title={title} size="medium" />

                  <div className="activity-record__identity">
                    <div>
                      <span className="activity-record__country">{country.toUpperCase()}</span>
                      <strong>{title}</strong>
                    </div>
                    <p>
                      {call.targetName || "Unknown recipient"}
                      <span>{call.targetPhone || "No phone stored"}</span>
                    </p>
                  </div>

                  <div className="activity-record__state">
                    <span className={statusClassName(call.status)}>
                      <span className="badge__dot" aria-hidden="true" />
                      {formatStatus(call.status)}
                    </span>
                    <time dateTime={call.timestamp ? new Date(call.timestamp * 1000).toISOString() : undefined}>
                      {formatTimestamp(call)}
                    </time>
                  </div>

                  <div className="activity-record__recording">
                    {call.isPlayable && call.url ? (
                      <audio controls preload="metadata" src={call.url} aria-label={`Recording for ${title}`} />
                    ) : (
                      <span className="recording-unavailable">
                        <Headphones aria-hidden="true" size={15} strokeWidth={1.5} />
                        No recording yet
                      </span>
                    )}
                  </div>

                  <button
                    className="button button--danger button--icon activity-record__remove"
                    type="button"
                    onClick={() => setCalls((current) => current.filter((item) => (
                      `${item.uid || item.accountDid}:${item._id}` !== rowKey
                    )))}
                    aria-label={`Hide ${title} until refresh`}
                    title="Hide until refresh"
                  >
                    <Trash2 aria-hidden="true" size={16} strokeWidth={1.5} />
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-state activity-empty">
            <span className="empty-state__number" aria-hidden="true">00</span>
            <div>
              <h2>No matching activity</h2>
              <p>Change the search or filter to see more records.</p>
              <button className="button button--outline" type="button" onClick={() => { setQuery(""); setFilter("all") }}>
                Clear filters
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
