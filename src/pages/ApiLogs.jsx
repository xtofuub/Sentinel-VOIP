import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleX,
  Clock3,
  Copy,
  Info,
  Search,
  SquareTerminal,
  Trash2,
  Wifi,
  Zap,
} from "@/components/icons"
import { useNavigate } from "react-router-dom"
import { clearApiLogs, getApiLogs, subscribeApiLogs } from "@/services/api"

const logFilters = [
  { id: "all", label: "All" },
  { id: "success", label: "Success" },
  { id: "issues", label: "Issues" },
  { id: "slow", label: "Slow" },
]

const parseJsonString = (value) => {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const formatJson = (value) => {
  if (value === null || value === undefined || value === "") return "--"
  const parsed = parseJsonString(value)
  if (typeof parsed === "string") return parsed

  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(parsed)
  }
}

const statusMeta = (log) => {
  if (log.ok) {
    return { label: `${log.status || 200} Success`, className: "is-success", Icon: CheckCircle2 }
  }
  if (Number(log.status) === 429) {
    return { label: "429 Retrying", className: "is-retrying", Icon: Clock3 }
  }
  if (!log.status) {
    return { label: "Network error", className: "is-error", Icon: Wifi }
  }
  return { label: `${log.status} Failed`, className: "is-error", Icon: CircleX }
}

const matchesFilter = (log, filter) => {
  if (filter === "success") return log.ok
  if (filter === "issues") return !log.ok
  if (filter === "slow") return Number(log.durationMs || 0) >= 1000
  return true
}

export function ApiLogs() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState(getApiLogs)
  const [expandedLogs, setExpandedLogs] = useState(() => new Set())
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [copiedKey, setCopiedKey] = useState("")
  const copyTimerRef = useRef(null)

  useEffect(() => subscribeApiLogs(setLogs), [])

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const metrics = useMemo(() => {
    const success = logs.filter((log) => log.ok).length
    const issues = logs.length - success
    const totalDuration = logs.reduce((sum, log) => sum + Number(log.durationMs || 0), 0)
    return {
      total: logs.length,
      success,
      issues,
      average: logs.length ? Math.round(totalDuration / logs.length) : 0,
      slow: logs.filter((log) => Number(log.durationMs || 0) >= 1000).length,
    }
  }, [logs])

  const visibleLogs = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return logs.filter((log) => {
      const matchesQuery = !normalized || [log.path, log.error, log.status, log.url]
        .some((value) => String(value || "").toLocaleLowerCase().includes(normalized))
      return matchesQuery && matchesFilter(log, filter)
    })
  }, [filter, logs, query])

  const clear = () => {
    clearApiLogs()
    setLogs([])
    setExpandedLogs(new Set())
    setFilter("all")
    setQuery("")
  }

  const resetFilters = () => {
    setFilter("all")
    setQuery("")
  }

  const toggleLog = (id) => {
    setExpandedLogs((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyText = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value)
      window.clearTimeout(copyTimerRef.current)
      setCopiedKey(key)
      copyTimerRef.current = window.setTimeout(() => setCopiedKey(""), 1500)
    } catch {
      setCopiedKey("")
    }
  }

  return (
    <main className="page product-page api-logs-page">
      <header className="product-hero product-hero--compact">
        <div className="product-hero__copy">
          <p className="eyebrow">Request diagnostics</p>
          <h1>
            Every request.<br />
            <em>One clear trace.</em>
          </h1>
          <p>Live browser and call-dispatch requests, with private recipient fields redacted.</p>
        </div>
        <div className="product-hero__meta" aria-label="Log retention">
          <span>Session memory</span>
          <strong>{logs.length}</strong>
          <small>of 120 retained</small>
        </div>
      </header>

      <section className="surface log-surface log-console" aria-labelledby="request-diagnostics-heading">
        <header className="log-console__header">
          <div className="surface-heading log-surface__heading">
            <span className="surface-index"><SquareTerminal size={18} aria-hidden="true" /></span>
            <div>
              <p className="eyebrow">Live · session only</p>
              <h2 id="request-diagnostics-heading">API logs</h2>
              <p>Requests disappear when this page reloads. Call launches appear as <code>dispatch-calls</code>.</p>
            </div>
          </div>
          <button
            className="button button--outline button--compact"
            type="button"
            onClick={clear}
            disabled={!logs.length}
            aria-label={`Clear ${logs.length} API logs`}
          >
            <Trash2 size={15} aria-hidden="true" />
            Clear
          </button>
        </header>

        <div className="log-metrics" aria-label="Request summary">
          <div><span>Total</span><strong>{metrics.total}</strong><small>requests</small></div>
          <div><span>Success</span><strong>{metrics.success}</strong><small>{metrics.total ? `${Math.round((metrics.success / metrics.total) * 100)}%` : "0%"}</small></div>
          <div><span>Issues</span><strong>{metrics.issues}</strong><small>need review</small></div>
          <div><span>Avg latency</span><strong>{metrics.average}</strong><small>milliseconds</small></div>
        </div>

        <div className="log-toolbar">
          <label className="log-search" htmlFor="api-log-search">
            <span className="visually-hidden">Search API logs</span>
            <Search size={17} aria-hidden="true" />
            <input
              id="api-log-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search endpoint, status, or error"
            />
          </label>
          <div className="log-filters" role="group" aria-label="Filter API logs">
            {logFilters.map((item) => {
              const count = item.id === "success"
                ? metrics.success
                : item.id === "issues"
                  ? metrics.issues
                  : item.id === "slow"
                    ? metrics.slow
                    : metrics.total
              return (
                <button
                  className="log-filter"
                  type="button"
                  key={item.id}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}<span>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="visually-hidden" aria-live="polite">
          {copiedKey ? "Copied to clipboard" : ""}
        </div>

        {visibleLogs.length ? (
          <>
            <div className="log-columns" aria-hidden="true">
              <span>Result</span><span>Method / endpoint</span><span>Time</span><span>Duration</span><span>Actions</span>
            </div>
            <ol className="log-list">
              {visibleLogs.map((log) => {
                const expanded = expandedLogs.has(log.id)
                const detailsId = `log-details-${log.id}`
                const meta = statusMeta(log)
                const requestText = expanded ? formatJson(log.request) : ""
                const responseText = expanded ? formatJson(log.response) : ""
                const timeLabel = new Date(log.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })

                return (
                  <li className={`log-entry ${meta.className}`} key={log.id}>
                    <div className="log-entry__row">
                      <button
                        className="log-entry__summary"
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        aria-label={`${expanded ? "Collapse" : "Expand"} POST ${log.path || "unknown endpoint"}, ${meta.label}, ${timeLabel}, ${log.durationMs ?? 0} milliseconds`}
                        onClick={() => toggleLog(log.id)}
                      >
                        <span className="log-entry__status">
                          <meta.Icon size={15} aria-hidden="true" />
                          {meta.label}
                        </span>
                        <span className="log-entry__endpoint">
                          <span>POST</span>
                          <code>{log.path || "Unknown endpoint"}</code>
                        </span>
                        <time dateTime={log.ts}>{timeLabel}</time>
                        <span className="log-entry__duration">{log.durationMs ?? 0} ms</span>
                        <ChevronDown className="log-entry__chevron" size={17} aria-hidden="true" />
                      </button>
                      <button
                        className="log-entry__copy"
                        type="button"
                        aria-label={`Copy POST ${log.path || "unknown endpoint"} event`}
                        title="Copy event"
                        onClick={() => void copyText(`event-${log.id}`, formatJson(log))}
                      >
                        {copiedKey === `event-${log.id}` ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                      </button>
                    </div>

                    <div className="log-entry__details" id={detailsId} hidden={!expanded}>
                      {expanded && (
                        <Fragment>
                          <dl className="log-entry__meta">
                            <div><dt>Method</dt><dd>POST</dd></div>
                            <div><dt>Occurred</dt><dd>{new Date(log.ts).toLocaleString()}</dd></div>
                            <div><dt>Duration</dt><dd>{log.durationMs ?? 0} ms</dd></div>
                            <div><dt>Endpoint</dt><dd><code>{log.url || log.path || "Unknown"}</code></dd></div>
                          </dl>

                          {log.error && (
                            <div className="log-entry__error-note">
                              <CircleAlert size={17} aria-hidden="true" />
                              <div><strong>Request issue</strong><p>{log.error}</p></div>
                            </div>
                          )}

                          <div className="log-entry__payloads">
                            <section aria-labelledby={`${detailsId}-request`}>
                              <header>
                                <div><p className="eyebrow" id={`${detailsId}-request`}>Request payload</p><small>{requestText.length.toLocaleString()} characters</small></div>
                                <button type="button" onClick={() => void copyText(`request-${log.id}`, requestText)}>
                                  {copiedKey === `request-${log.id}` ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                  {copiedKey === `request-${log.id}` ? "Copied" : "Copy"}
                                </button>
                              </header>
                              <pre>{requestText}</pre>
                            </section>
                            <section aria-labelledby={`${detailsId}-response`}>
                              <header>
                                <div><p className="eyebrow" id={`${detailsId}-response`}>Response payload</p><small>{responseText.length.toLocaleString()} characters</small></div>
                                <button type="button" onClick={() => void copyText(`response-${log.id}`, responseText)}>
                                  {copiedKey === `response-${log.id}` ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                  {copiedKey === `response-${log.id}` ? "Copied" : "Copy"}
                                </button>
                              </header>
                              <pre>{responseText}</pre>
                            </section>
                          </div>
                        </Fragment>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        ) : logs.length ? (
          <div className="empty-state log-empty">
            <span className="empty-state__number" aria-hidden="true"><SquareTerminal size={34} /></span>
            <div><h2>No matching requests</h2><p>Change the search or status filter to widen the trace.</p><button className="button button--outline" type="button" onClick={resetFilters}>Reset filters</button></div>
          </div>
        ) : (
          <div className="empty-state log-empty">
            <span className="empty-state__number" aria-hidden="true"><Zap size={34} /></span>
            <div>
              <h2>No requests this session</h2>
              <p>Create a session or refresh Activity. Sanitized requests will appear here in real time.</p>
              <button className="button button--primary" type="button" onClick={() => navigate("/new")}>Open New session</button>
            </div>
            <Info className="log-empty__info" size={18} aria-hidden="true" />
          </div>
        )}
      </section>
    </main>
  )
}
