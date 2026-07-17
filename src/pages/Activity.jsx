import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Headphones,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Waves,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { ActivityAudioPlayer } from "@/components/ActivityAudioPlayer"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { enrichRecordedCallsWithLocalInput, getRecordedCalls } from "@/services/api"
import "./Activity.css"

const ACTIVE_STATUSES = new Set(["pending", "queued", "running"])
const LIVE_POLL_INTERVAL = 10000
const IDLE_POLL_INTERVAL = 60000
const HIDDEN_ACTIVITY_KEY = "sentinel-hidden-activity"
const HIDDEN_ACTIVITY_LIMIT = 1000

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

const callRowKey = (call) => `${call.uid || call.accountDid}:${call._id}`

const readHiddenActivity = () => {
  try {
    const value = JSON.parse(localStorage.getItem(HIDDEN_ACTIVITY_KEY) || "[]")
    return new Set(Array.isArray(value) ? value.filter((key) => typeof key === "string") : [])
  } catch {
    return new Set()
  }
}

const parseBackendTimeLabel = (value) => {
  if (!value) return null

  const label = String(value).trim()
  const dayFirst = label.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (dayFirst) {
    const [, day, month, year, hour, minute, second = "0"] = dayFirst
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(label)
  return Number.isNaN(date.getTime()) ? null : date
}

const getCallDate = (call) => {
  const rawTimestamp = Number(call?.timestamp)
  if (Number.isFinite(rawTimestamp) && rawTimestamp > 0) {
    const milliseconds = rawTimestamp > 1e12 ? rawTimestamp : rawTimestamp * 1000
    const date = new Date(milliseconds)
    if (!Number.isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date
  }

  return parseBackendTimeLabel(call?.timeLabel)
}

const formatTimestamp = (call, now = new Date()) => {
  const date = getCallDate(call)
  if (!date) return { exact: "Time unavailable", iso: undefined, label: "Time unavailable" }

  const deltaMs = date.getTime() - now.getTime()
  const absoluteDelta = Math.abs(deltaMs)
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date)
  const exact = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date)

  let label
  if (absoluteDelta < 45_000) {
    label = "Just now"
  } else if (absoluteDelta < 60 * 60_000) {
    label = relative.format(Math.round(deltaMs / 60_000), "minute")
  } else if (absoluteDelta < 6 * 60 * 60_000) {
    label = relative.format(Math.round(deltaMs / (60 * 60_000)), "hour")
  } else {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const callDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayDelta = Math.round((callDay.getTime() - today.getTime()) / 86_400_000)

    if (dayDelta === 0) label = `Today at ${time}`
    else if (dayDelta === -1) label = `Yesterday at ${time}`
    else if (dayDelta === 1) label = `Tomorrow at ${time}`
    else label = new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return { exact, iso: date.toISOString(), label }
}

const formatSyncTime = (timestamp) => new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
}).format(timestamp)

const getRecordingSourceUrl = (call) => {
  try {
    const url = new URL(String(call?.url || "").trim())
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    if (url.protocol === "http:") url.protocol = "https:"
    return url.href
  } catch {
    return ""
  }
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [linkAction, setLinkAction] = useState({ message: "", rowKey: "", type: "" })
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden")
  const accountsRef = useRef(accounts)
  const mountedRef = useRef(false)
  const refreshingRef = useRef(false)
  const refreshQueuedRef = useRef(false)
  const hiddenActivityRef = useRef(readHiddenActivity())
  const linkActionTimerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      window.clearTimeout(linkActionTimerRef.current)
    }
  }, [])

  const showLinkAction = useCallback((rowKey, type, message) => {
    window.clearTimeout(linkActionTimerRef.current)
    setLinkAction({ message, rowKey, type })
    linkActionTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setLinkAction({ message: "", rowKey: "", type: "" })
    }, 3200)
  }, [])

  const copyRecordingLink = useCallback(async (rowKey, sourceUrl) => {
    if (!sourceUrl) return
    try {
      await navigator.clipboard.writeText(sourceUrl)
      showLinkAction(rowKey, "copy", "Direct recording link copied.")
    } catch {
      showLinkAction(rowKey, "error", "The recording link could not be copied.")
    }
  }, [showLinkAction])

  const shareRecording = useCallback(async (rowKey, call, title) => {
    const sourceUrl = getRecordingSourceUrl(call)
    if (!sourceUrl) return

    if (!navigator.share) {
      await copyRecordingLink(rowKey, sourceUrl)
      return
    }

    try {
      await navigator.share({
        title,
        text: "Listen to this recorded call.",
        url: sourceUrl,
      })
      showLinkAction(rowKey, "share", "Recording shared from its direct source.")
    } catch (shareError) {
      if (shareError?.name === "AbortError") return
      await copyRecordingLink(rowKey, sourceUrl)
    }
  }, [copyRecordingLink, showLinkAction])

  useEffect(() => {
    accountsRef.current = accounts
  }, [accounts])

  useEffect(() => {
    const syncBrowserState = () => {
      setAccounts(readAccounts())
      hiddenActivityRef.current = readHiddenActivity()
      setCalls((current) => current.filter((call) => !hiddenActivityRef.current.has(callRowKey(call))))
    }
    window.addEventListener("focus", syncBrowserState)
    window.addEventListener("storage", syncBrowserState)
    return () => {
      window.removeEventListener("focus", syncBrowserState)
      window.removeEventListener("storage", syncBrowserState)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (refreshingRef.current) {
      refreshQueuedRef.current = true
      return
    }

    refreshingRef.current = true

    try {
      do {
        refreshQueuedRef.current = false
        const currentAccounts = accountsRef.current

        if (!currentAccounts.length) {
          if (mountedRef.current) {
            setCalls([])
            setError("")
            setAllRequestsFailed(false)
            setLoading(false)
          }
          continue
        }

        if (mountedRef.current) {
          setLoading(true)
          setError("")
          setAllRequestsFailed(false)
        }

        const requests = currentAccounts
          .map((account) => ({ account, did: account?.did || account?.uid }))
          .filter(({ did }) => Boolean(did))
          .map(async ({ account, did }) => {
            const accountCalls = await getRecordedCalls(account.country || "fi", did)
            return accountCalls.map((call) => ({
              ...call,
              accountCountry: account.country || "fi",
              accountDid: did,
            }))
          })

        const results = await Promise.allSettled(requests)
        if (!mountedRef.current) return

        const failures = results.filter((result) => result.status === "rejected")
        const rows = results.flatMap((result) => result.status === "fulfilled" ? result.value : [])
        const unique = Array.from(new Map(rows.map((call) => [
          `${call.uid || call.accountDid}:${call._id}`,
          call,
        ])).values()).sort((a, b) => (
          (getCallDate(b)?.getTime() || 0) - (getCallDate(a)?.getTime() || 0)
        ))

        const visibleRows = unique.filter((call) => !hiddenActivityRef.current.has(callRowKey(call)))
        setCalls(enrichRecordedCallsWithLocalInput(visibleRows))
        setAllRequestsFailed(requests.length > 0 && failures.length === requests.length)
        setLastUpdatedAt(Date.now())
        if (failures.length) {
          setError(`${failures.length} call update${failures.length === 1 ? "" : "s"} could not load. Try again shortly.`)
        }
      } while (refreshQueuedRef.current && mountedRef.current)
    } finally {
      refreshingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const removeCall = useCallback((rowKey) => {
    const nextHidden = new Set(hiddenActivityRef.current)
    nextHidden.add(rowKey)
    hiddenActivityRef.current = nextHidden

    try {
      localStorage.setItem(HIDDEN_ACTIVITY_KEY, JSON.stringify(Array.from(nextHidden).slice(-HIDDEN_ACTIVITY_LIMIT)))
    } catch {
      // The record remains hidden for this visit when browser storage is unavailable.
    }

    setCalls((current) => current.filter((call) => callRowKey(call) !== rowKey))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const running = calls.some((call) => ACTIVE_STATUSES.has(call.status))

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState !== "hidden"
      setPageVisible(isVisible)
      if (isVisible) void refresh()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [refresh])

  useEffect(() => {
    if (!accounts.length || !pageVisible) return undefined
    const interval = window.setInterval(() => {
      void refresh()
    }, running ? LIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL)
    return () => window.clearInterval(interval)
  }, [accounts.length, pageVisible, refresh, running])

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
  const pollIntervalSeconds = (running ? LIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL) / 1000
  const syncLabel = !pageVisible
    ? "Updates paused"
    : loading
      ? "Syncing now"
      : running
        ? `Live · ${pollIntervalSeconds} sec`
        : accounts.length
          ? `Auto · ${pollIntervalSeconds} sec`
          : "Standing by"

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
      <header className="activity-page__header">
        <div className="activity-page__title">
          <span aria-hidden="true"><Waves size={19} strokeWidth={1.65} /></span>
          <div>
            <h1>Activity</h1>
            <p>Review recent calls and share finished recordings straight from their source.</p>
          </div>
        </div>

        <div className="activity-page__controls">
          <div className="activity-sync">
            <span className={`badge ${running && pageVisible ? "badge--live" : "badge--neutral"}`} aria-live="polite">
              <span className="badge__dot" aria-hidden="true" />
              {syncLabel}
            </span>
            <small>
              {lastUpdatedAt ? `Updated ${formatSyncTime(lastUpdatedAt)}` : "Waiting for first sync"}
            </small>
          </div>
          <button
            className="button button--outline button--compact"
            type="button"
            onClick={() => void refresh()}
            disabled={loading || !accounts.length}
          >
            <RefreshCw className={loading ? "is-spinning" : undefined} aria-hidden="true" size={15} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      <section className="surface activity-hub" aria-labelledby="activity-results-heading">
        <header className="activity-hub__header">
          <div>
            <h2 id="activity-results-heading">Calls and recordings</h2>
            <p>{calls.length.toLocaleString()} total · {recordingCount.toLocaleString()} ready to share · {activeCount.toLocaleString()} active</p>
          </div>
          <p className="activity-hub__source-note">
            <Share2 size={15} aria-hidden="true" />
            Shared recordings open directly—no Sentinel account needed.
          </p>
        </header>

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

        <p className={`activity-action-status${linkAction.message ? " is-visible" : ""}`} role="status" aria-live="polite">
          {linkAction.message}
        </p>

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
              <h2>No call history yet</h2>
              <p>Place your first call and its recording will appear here when ready.</p>
              <button className="button button--primary" type="button" onClick={() => navigate("/new")}>
                Create a session <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : loading && !calls.length ? (
          <div className="loading-state" role="status" aria-live="polite">
            <span className="loading-mark" aria-hidden="true" />
            <p>Loading the latest calls...</p>
          </div>
        ) : allRequestsFailed ? (
          <div className="empty-state activity-empty">
            <span className="empty-state__number" aria-hidden="true">!</span>
            <div>
              <h2>Call history unavailable</h2>
              <p>Your saved call links are still here. Retry when the service is reachable.</p>
              <button className="button button--outline" type="button" onClick={() => void refresh()}>
                Retry activity
              </button>
            </div>
          </div>
        ) : filteredCalls.length ? (
          <div className="activity-records">
            {filteredCalls.map(({ call, scenario, country }) => {
              const rowKey = callRowKey(call)
              const title = call.titulo || scenario?.titulo || "Untitled scenario"
              const thumbnail = call.pic || scenario?.image_url
              const detailPath = `/activity/${encodeURIComponent(call.accountDid || call.uid || "unknown")}/${encodeURIComponent(call._id)}`
              const timestamp = formatTimestamp(call)
              const sourceUrl = getRecordingSourceUrl(call)
              const copied = linkAction.rowKey === rowKey && linkAction.type === "copy"
              const shared = linkAction.rowKey === rowKey && linkAction.type === "share"

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

                  <div className="activity-record__progress">
                    <div className="activity-record__state">
                      <time dateTime={timestamp.iso} title={timestamp.exact}>
                        {timestamp.label}
                      </time>
                    </div>
                  </div>

                  <div className="activity-record__recording">
                    {call.isPlayable && sourceUrl ? (
                      <ActivityAudioPlayer src={sourceUrl} label={`recording for ${title}`} />
                    ) : (
                      <span className="recording-unavailable">
                        <Headphones aria-hidden="true" size={15} strokeWidth={1.5} />
                        No recording yet
                      </span>
                    )}
                    <div className="activity-record__quick-actions">
                      {sourceUrl && (
                        <>
                          <button type="button" onClick={() => void shareRecording(rowKey, call, title)}>
                            {shared ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
                            {shared ? "Shared" : "Share"}
                          </button>
                          <button type="button" onClick={() => void copyRecordingLink(rowKey, sourceUrl)}>
                            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                            {copied ? "Copied" : "Copy link"}
                          </button>
                          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} aria-hidden="true" /> Source
                          </a>
                        </>
                      )}
                      <Link to={detailPath} aria-label={`Open record for ${title}`}>
                        Details <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>

                  <button
                    className="button button--danger button--icon activity-record__remove"
                    type="button"
                    onClick={() => removeCall(rowKey)}
                    aria-label={`Remove ${title} from Activity`}
                    title="Remove from Activity"
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
