import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Headphones,
  LoaderCircle,
  MoreVertical,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  UserPlus,
  UserRoundCheck,
  Waves,
  X,
} from "@/components/icons"
import { Link, useNavigate } from "react-router-dom"
import { AudioPlayer } from "@/components/AudioPlayer"
import { AuthPromptDialog } from "@/components/AuthPromptDialog"
import { LocaleFlag } from "@/components/LocaleFlag"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { getRecordedCalls } from "@/services/api"
import {
  enrichRecordedCallsWithHistory,
  hideActivityRecord,
  loadActivityHistory,
  migrateLocalActivityToCloud,
  readLocalActivityLaunches,
  readLocalActivitySources,
  readLocalHiddenActivity,
  subscribeToActivityHistory,
} from "@/services/activityHistory"
import { useAuth } from "@/state/AuthContext"
import { isValidContactPhone, rememberContact } from "@/services/contacts"
import {
  callSessionToActivity,
  cancelCallSession,
  listCallSessions,
} from "@/services/callSessions"
import "./Activity.css"

const ACTIVE_STATUSES = new Set(["scheduled", "pending", "queued", "running"])
const LIVE_STATUSES = new Set(["pending", "queued", "running"])
const ISSUE_STATUSES = new Set(["declined", "failed"])
const LIVE_POLL_INTERVAL = 10000
const IDLE_POLL_INTERVAL = 60000
const HIDDEN_ACTIVITY_LIMIT = 1000

const activityFilters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "recordings", label: "Recordings" },
  { id: "issues", label: "Issues" },
]

const callRowKey = (call) => `${call.uid || call.accountDid}:${call._id}`
const cleanActivityTitle = (value) => String(value || "")
  .replace(/^(?:⭐|🌟)\s*/u, "")
  .trim()

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

const formatHistoryGroup = (call, now = new Date()) => {
  const date = getCallDate(call)
  if (!date) return "Date unavailable"

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const callDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDelta = Math.round((callDay.getTime() - today.getTime()) / 86_400_000)

  if (dayDelta === 0) return "Today"
  if (dayDelta === -1) return "Yesterday"
  if (dayDelta > -7 && dayDelta < 0) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date)
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date)
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
  const { refreshProfile, user } = useAuth()
  const userId = user?.id
  const [accounts, setAccounts] = useState(readLocalActivitySources)
  const [launches, setLaunches] = useState(readLocalActivityLaunches)
  const [calls, setCalls] = useState([])
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [hiddenActivity, setHiddenActivity] = useState(readLocalHiddenActivity)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [allRequestsFailed, setAllRequestsFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [linkAction, setLinkAction] = useState({ message: "", rowKey: "", type: "" })
  const [savingContactKey, setSavingContactKey] = useState("")
  const [cancellingSessionKey, setCancellingSessionKey] = useState("")
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden")
  const accountsRef = useRef(accounts)
  const launchesRef = useRef(launches)
  const mountedRef = useRef(false)
  const refreshingRef = useRef(false)
  const refreshQueuedRef = useRef(false)
  const hiddenActivityRef = useRef(readLocalHiddenActivity())
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

  const saveCallContact = useCallback(async (rowKey, call) => {
    if (!userId) {
      setAuthPromptOpen(true)
      return
    }

    const name = call.targetName?.trim()
    const phoneNumber = call.targetPhone?.trim()
    if (!name || !isValidContactPhone(phoneNumber)) {
      showLinkAction(rowKey, "error", "This call does not have a complete name and phone number.")
      return
    }

    setSavingContactKey(rowKey)
    try {
      await rememberContact({ userId, name, phoneNumber })
      showLinkAction(rowKey, "contact", `${name} saved to Contacts.`)
    } catch (contactError) {
      showLinkAction(rowKey, "error", contactError?.message || "Contact could not be saved.")
    } finally {
      setSavingContactKey("")
    }
  }, [showLinkAction, userId])

  useEffect(() => {
    accountsRef.current = accounts
  }, [accounts])

  useEffect(() => {
    launchesRef.current = launches
  }, [launches])

  const syncHistory = useCallback(async () => {
    try {
      if (userId) await migrateLocalActivityToCloud(userId)
      const [history, sessions] = await Promise.all([
        loadActivityHistory(userId),
        listCallSessions(userId),
      ])
      accountsRef.current = history.sources
      launchesRef.current = history.launches
      hiddenActivityRef.current = history.hidden
      setHiddenActivity(history.hidden)
      setAccounts(history.sources)
      setLaunches(history.launches)
      setScheduledSessions(sessions)
      setCalls((current) => current.filter((call) => !history.hidden.has(callRowKey(call))))
    } catch {
      const localSources = readLocalActivitySources()
      const localLaunches = readLocalActivityLaunches()
      const localHidden = readLocalHiddenActivity()
      accountsRef.current = localSources
      launchesRef.current = localLaunches
      hiddenActivityRef.current = localHidden
      setHiddenActivity(localHidden)
      setAccounts(localSources)
      setLaunches(localLaunches)
      setScheduledSessions([])
    }
  }, [userId])

  useEffect(() => {
    const syncBrowserState = () => {
      void syncHistory()
    }
    window.addEventListener("focus", syncBrowserState)
    window.addEventListener("storage", syncBrowserState)
    return () => {
      window.removeEventListener("focus", syncBrowserState)
      window.removeEventListener("storage", syncBrowserState)
    }
  }, [syncHistory])

  useEffect(() => {
    void syncHistory()
    return subscribeToActivityHistory(userId, () => {
      void syncHistory()
    })
  }, [syncHistory, userId])

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
        setCalls(enrichRecordedCallsWithHistory(visibleRows, launchesRef.current))
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
    setHiddenActivity(nextHidden)

    try {
      localStorage.setItem("sentinel-hidden-activity", JSON.stringify(Array.from(nextHidden).slice(-HIDDEN_ACTIVITY_LIMIT)))
    } catch {
      // The record remains hidden for this visit when browser storage is unavailable.
    }

    setCalls((current) => current.filter((call) => callRowKey(call) !== rowKey))
    setScheduledSessions((current) => current.filter((session) => callRowKey(callSessionToActivity(session)) !== rowKey))
    if (userId) {
      void hideActivityRecord(userId, rowKey).catch(() => {
        showLinkAction(rowKey, "error", "Removed here, but account sync needs another try.")
      })
    }
  }, [showLinkAction, userId])

  const cancelScheduled = useCallback(async (rowKey, sessionId) => {
    setCancellingSessionKey(rowKey)
    try {
      const updated = await cancelCallSession(sessionId)
      setScheduledSessions((current) => current.map((session) => (
        session.id === sessionId ? updated : session
      )))
      void refreshProfile()
      showLinkAction(rowKey, "cancel", "Scheduled call cancelled. Credit returned.")
    } catch (cancelError) {
      showLinkAction(rowKey, "error", cancelError?.message || "The call could not be cancelled.")
    } finally {
      setCancellingSessionKey("")
    }
  }, [refreshProfile, showLinkAction])

  useEffect(() => {
    void refresh()
  }, [accounts, refresh])

  useEffect(() => {
    setCalls((current) => enrichRecordedCallsWithHistory(current, launches))
  }, [launches])

  const displayCalls = useMemo(() => {
    const remoteTaskIds = new Set(calls.map((call) => String(call._id || "").toLowerCase()))
    const sessionRows = scheduledSessions
      .map(callSessionToActivity)
      .filter((call) => (
        !call.upstreamTaskId
        || !remoteTaskIds.has(String(call.upstreamTaskId).toLowerCase())
      ))
      .filter((call) => !hiddenActivity.has(callRowKey(call)))

    return [...calls, ...sessionRows].sort((a, b) => (
      (getCallDate(b)?.getTime() || 0) - (getCallDate(a)?.getTime() || 0)
    ))
  }, [calls, hiddenActivity, scheduledSessions])

  const running = displayCalls.some((call) => LIVE_STATUSES.has(call.status))

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

  const resolvedCalls = useMemo(() => displayCalls.map((call) => {
    const country = call.cou || call.accountCountry || "fi"
    const scenario = catalogByDial.get(`${country}|${String(call.dial || "")}`)
      || catalogByTitle.get(call.titulo?.trim().toLowerCase())

    return { call, scenario, country }
  }), [displayCalls, catalogByDial, catalogByTitle])

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
        || (filter === "issues" && ISSUE_STATUSES.has(call.status))

      return matchesQuery && matchesFilter
    })
  }, [filter, query, resolvedCalls])

  const hasActivity = accounts.length > 0 || displayCalls.length > 0

  const groupedCalls = useMemo(() => {
    const groups = new Map()

    filteredCalls.forEach((entry) => {
      const label = formatHistoryGroup(entry.call)
      const group = groups.get(label) || []
      group.push(entry)
      groups.set(label, group)
    })

    return Array.from(groups, ([label, entries]) => ({ label, entries }))
  }, [filteredCalls])

  return (
    <main className="page product-page call-history-page">
      <header className="call-history-page__header">
        <div className="call-history-page__title">
          <h1 id="call-history-title">Call history</h1>
          <p>Every prank, recipient, and reaction recording—kept together.</p>
        </div>

        <div className="call-history-page__controls">
          <div className="call-history-sync">
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
            onClick={() => {
              void syncHistory()
              void refresh()
            }}
            disabled={loading}
          >
            <RefreshCw className={loading ? "is-spinning" : undefined} aria-hidden="true" size={15} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </header>

      <section className="call-history-panel" aria-labelledby="call-history-title">
        {hasActivity && (
          <>
            <div className="call-history-toolbar">
              <label className="call-history-search" htmlFor="activity-search">
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

              <div className="call-history-filters" role="group" aria-label="Filter call history">
                {activityFilters.map((item) => (
                  <button
                    key={item.id}
                    className="call-history-filter"
                    type="button"
                    aria-pressed={filter === item.id}
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </>
        )}

        {linkAction.message && (
          <p className={`call-history-action-status${linkAction.type === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
            {linkAction.type === "error" ? <CircleAlert size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
            {linkAction.message}
          </p>
        )}

        {error && (
          <div className="notice notice--warning" role="status">
            <Waves aria-hidden="true" size={18} strokeWidth={1.5} />
            <div>
              <strong>{allRequestsFailed ? "Activity could not load" : "Some records are unavailable"}</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!hasActivity ? (
          <div className="call-history-empty">
            <div>
              <h2>No call history yet</h2>
              <p>Place your first call and its recording will appear here when ready.</p>
              <button className="button button--primary" type="button" onClick={() => navigate("/new")}>
                Create a session <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : loading && !displayCalls.length ? (
          <div className="call-history-skeleton" role="status" aria-live="polite">
            <span className="visually-hidden">Loading the latest calls...</span>
            {[0, 1, 2].map((item) => (
              <div className="call-history-skeleton__row" key={item} aria-hidden="true">
                <span className="call-history-skeleton__image" />
                <span className="call-history-skeleton__lines" />
                <span className="call-history-skeleton__audio" />
              </div>
            ))}
          </div>
        ) : allRequestsFailed && !scheduledSessions.length ? (
          <div className="call-history-empty">
            <div>
              <h2>Call history unavailable</h2>
              <p>Your saved call links are still here. Retry when the service is reachable.</p>
              <button className="button button--outline" type="button" onClick={() => void refresh()}>
                Retry activity
              </button>
            </div>
          </div>
        ) : filteredCalls.length ? (
          <div className="call-history-groups">
            {groupedCalls.map((group) => (
              <section className="call-history-group" key={group.label} aria-labelledby={`history-group-${group.label.replace(/\W+/g, "-").toLowerCase()}`}>
                <header className="call-history-group__header">
                  <h2 id={`history-group-${group.label.replace(/\W+/g, "-").toLowerCase()}`}>{group.label}</h2>
                  <span>{group.entries.length} {group.entries.length === 1 ? "call" : "calls"}</span>
                </header>

                <div className="call-history-group__records">
                  {group.entries.map(({ call, scenario, country }) => {
                    const rowKey = callRowKey(call)
                    const title = cleanActivityTitle(call.titulo || scenario?.titulo) || "Untitled scenario"
                    const thumbnail = call.pic || scenario?.image_url
                    const detailPath = `/activity/${encodeURIComponent(call.accountDid || call.uid || "unknown")}/${encodeURIComponent(call._id)}`
                    const timestamp = formatTimestamp(call)
                    const sourceUrl = getRecordingSourceUrl(call)
                    const shareComplete = linkAction.rowKey === rowKey && ["copy", "share"].includes(linkAction.type)
                    const shareLabel = linkAction.type === "copy" ? "Copied" : "Shared"
                    const canSaveContact = Boolean(call.targetName?.trim() && isValidContactPhone(call.targetPhone))
                    const contactSaved = linkAction.rowKey === rowKey && linkAction.type === "contact"
                    const savingContact = savingContactKey === rowKey
                    const cancellingSession = cancellingSessionKey === rowKey
                    const callStatus = String(call.status || "").toLowerCase()
                    const scheduled = callStatus === "scheduled"
                    const queued = callStatus === "pending" || callStatus === "queued"
                    const calling = callStatus === "running"
                    const active = scheduled || queued || calling
                    const declined = callStatus === "declined"
                    const failed = callStatus === "failed"
                    const cancelled = callStatus === "cancelled"
                    const completed = callStatus === "completed"
                    const ready = call.isPlayable && Boolean(sourceUrl)
                    const hasOverflowActions = Boolean(sourceUrl || canSaveContact || !scheduled)

                    return (
                      <article
                        className={`call-history-record${call.isPlayable && sourceUrl ? " has-recording" : " is-status-only"}`}
                        data-status={callStatus || "unknown"}
                        key={rowKey}
                      >
                        <ScenarioThumbnail src={thumbnail} title={title} size="small" />

                        <div className="call-history-record__content">
                          <header className="call-history-record__header">
                            <div className="call-history-record__identity">
                              <h3>{call.targetName || call.targetPhone || "Unknown recipient"}</h3>
                              <div className="call-history-record__recipient">
                                <span className="call-history-record__country" title={country.toUpperCase()}>
                                  <LocaleFlag code={country} />
                                </span>
                                <span dir="ltr">{call.targetPhone || "No phone stored"}</span>
                                <span aria-hidden="true">·</span>
                                <span className="call-history-record__scenario">{title}</span>
                              </div>
                            </div>

                            <div className="call-history-record__when">
                              {ready && <span className="is-ready"><i aria-hidden="true" />Ready</span>}
                              {scheduled && <span className="is-scheduled"><i aria-hidden="true" />Scheduled</span>}
                              {queued && <span className="is-queued"><i aria-hidden="true" />Queued</span>}
                              {calling && <span className="is-calling"><i aria-hidden="true" />Calling</span>}
                              {declined && <span className="is-declined"><i aria-hidden="true" />Declined</span>}
                              {failed && <span className="is-failed"><i aria-hidden="true" />Failed</span>}
                              {cancelled && <span className="is-cancelled"><i aria-hidden="true" />Cancelled</span>}
                              {completed && <span className="is-completed"><i aria-hidden="true" />Ended</span>}
                              <time dateTime={timestamp.iso} title={timestamp.exact}>{timestamp.label}</time>
                            </div>
                          </header>

                          {call.isPlayable && sourceUrl ? (
                            <div className="call-history-record__recording is-playable">
                              <AudioPlayer src={sourceUrl} label={`recording for ${title}`} />
                            </div>
                          ) : (
                            <div className="call-history-record__recording is-compact">
                              <Headphones aria-hidden="true" size={15} strokeWidth={1.5} />
                              <span className="call-history-record__recording-empty">
                                {scheduled
                                  ? `Scheduled for ${timestamp.label.toLowerCase()}`
                                  : declined || failed
                                    ? call.failureReason || "The provider did not place this call"
                                    : cancelled
                                      ? "This call was cancelled"
                                      : completed
                                        ? "Recording has not returned yet"
                                      : queued
                                        ? "Waiting for the provider"
                                        : active
                                          ? "Call in progress"
                                          : "Recording is not ready yet"}
                              </span>
                            </div>
                          )}

                          <footer className="call-history-record__actions">
                            {!call.isScheduledSession && (
                              <Link className="call-history-record__details" to={detailPath} aria-label={`Open record for ${title}`}>
                                View details <ArrowUpRight size={14} aria-hidden="true" />
                              </Link>
                            )}
                            {call.isScheduledSession && scheduled && (
                              <button
                                className="call-history-record__cancel"
                                type="button"
                                disabled={cancellingSession}
                                onClick={() => void cancelScheduled(rowKey, call.sessionId)}
                              >
                                {cancellingSession ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                                {cancellingSession ? "Cancelling" : "Cancel call"}
                              </button>
                            )}
                            {hasOverflowActions && (
                              <details className="call-history-record__menu">
                                <summary aria-label={`More actions for ${title}`} title="More actions">
                                  <MoreVertical aria-hidden="true" size={18} />
                                </summary>
                                <div className="call-history-record__menu-popover">
                                  {sourceUrl && (
                                    <button
                                      className="call-history-record__share"
                                      type="button"
                                      onClick={(event) => {
                                        event.currentTarget.closest("details")?.removeAttribute("open")
                                        void shareRecording(rowKey, call, title)
                                      }}
                                    >
                                      {shareComplete ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
                                      {shareComplete ? shareLabel : "Share recording"}
                                    </button>
                                  )}
                                  {canSaveContact && (
                                    <button
                                      className={`call-history-record__save-contact${contactSaved ? " is-saved" : ""}`}
                                      type="button"
                                      disabled={savingContact}
                                      onClick={(event) => {
                                        event.currentTarget.closest("details")?.removeAttribute("open")
                                        void saveCallContact(rowKey, call)
                                      }}
                                    >
                                      {savingContact ? (
                                        <LoaderCircle className="spin" size={14} aria-hidden="true" />
                                      ) : contactSaved ? (
                                        <UserRoundCheck size={14} aria-hidden="true" />
                                      ) : (
                                        <UserPlus size={14} aria-hidden="true" />
                                      )}
                                      {savingContact ? "Saving" : contactSaved ? "Saved to contacts" : "Save to contacts"}
                                    </button>
                                  )}
                                  {!scheduled && (
                                    <button
                                      className="call-history-record__remove"
                                      type="button"
                                      onClick={(event) => {
                                        event.currentTarget.closest("details")?.removeAttribute("open")
                                        removeCall(rowKey)
                                      }}
                                    >
                                      <Trash2 aria-hidden="true" size={15} strokeWidth={1.5} />
                                      Remove from history
                                    </button>
                                  )}
                                </div>
                              </details>
                            )}
                          </footer>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="call-history-empty">
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
      <AuthPromptDialog
        open={authPromptOpen}
        reason="contacts"
        nextPath="/activity"
        onClose={() => setAuthPromptOpen(false)}
      />
    </main>
  )
}
