import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Download,
  Globe2,
  Headphones,
  Link2,
  Pencil,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserRound,
  X,
} from "@/components/icons"
import { useNavigate, useParams } from "react-router-dom"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { enrichRecordedCallsWithLocalInput, getRecordedCalls } from "@/services/api"
import "./RecordingDetail.css"

const RECORDING_ALIASES_KEY = "recordingAliases"

const readAccounts = () => {
  try {
    const value = JSON.parse(localStorage.getItem("activeAccounts") || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const readAliases = () => {
  try {
    const value = JSON.parse(localStorage.getItem(RECORDING_ALIASES_KEY) || "{}")
    return value && typeof value === "object" && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

const recordingKey = (accountDid, recordingId) => `${accountDid || "unknown"}:${recordingId}`

const formatStatus = (status) => {
  if (!status) return "Unknown"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const formatTimestamp = (call) => {
  if (call?.timeLabel) return call.timeLabel
  if (!call?.timestamp) return "Time unavailable"
  return new Date(call.timestamp * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const statusClassName = (status) => {
  const normalized = String(status || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "")
  return `recording-detail__status recording-detail__status--${normalized || "unknown"}`
}

const makeWaveform = (seed = "sentinel") => Array.from({ length: 64 }, (_, index) => {
  const code = seed.charCodeAt(index % seed.length) || 83
  return 22 + ((code * (index + 5) * 17) % 70)
})

const getRecordingSourceUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim())
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    if (url.protocol === "http:") url.protocol = "https:"
    return url.href
  } catch {
    return ""
  }
}

export function RecordingDetail() {
  const navigate = useNavigate()
  const { accountDid, recordingId } = useParams()
  const [record, setRecord] = useState(null)
  const [phase, setPhase] = useState("loading")
  const [message, setMessage] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [alias, setAlias] = useState("")
  const [draftAlias, setDraftAlias] = useState("")
  const [editing, setEditing] = useState(false)
  const [actionMessage, setActionMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setPhase("loading")
      setMessage("")
      setRecord(null)

      if (!recordingId) {
        setPhase("not-found")
        setMessage("This recording link is incomplete.")
        return
      }

      const accounts = readAccounts()
      if (!accounts.length) {
        setPhase("not-found")
        setMessage("No call history in this browser can open this recording.")
        return
      }

      const eligibleAccounts = accountDid
        ? accounts.filter((account) => String(account?.did || account?.uid || "") === accountDid)
        : accounts

      if (!eligibleAccounts.length) {
        setPhase("not-found")
        setMessage("This call is no longer saved in this browser.")
        return
      }

      const requests = await Promise.allSettled(eligibleAccounts.map(async (account) => {
        const did = String(account?.did || account?.uid || "")
        const country = account?.country || "fi"
        const calls = await getRecordedCalls(country, did)
        return enrichRecordedCallsWithLocalInput(calls).map((call) => ({
          ...call,
          accountCountry: country,
          accountDid: did,
        }))
      }))

      if (cancelled) return

      const fulfilled = requests.filter((request) => request.status === "fulfilled")
      const calls = fulfilled.flatMap((request) => request.value)
      const match = calls.find((call) => String(call._id) === recordingId)

      if (match) {
        const key = recordingKey(match.accountDid, match._id)
        const savedAlias = String(readAliases()[key] || "")
        setRecord(match)
        setAlias(savedAlias)
        setDraftAlias(savedAlias || match.titulo || "")
        setPhase("ready")
        return
      }

      if (!fulfilled.length) {
        setPhase("error")
        setMessage("The recording service could not be reached. Your saved call history is still intact.")
        return
      }

      setPhase("not-found")
      setMessage("This recording was not returned for the saved call.")
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [accountDid, recordingId, reloadKey])

  const waveform = useMemo(() => makeWaveform(recordingId), [recordingId])
  const audioUrl = getRecordingSourceUrl(record?.url)
  const displayTitle = alias || record?.titulo || "Untitled recording"

  const saveAlias = (event) => {
    event.preventDefault()
    if (!record) return

    const cleanAlias = draftAlias.trim()
    const key = recordingKey(record.accountDid, record._id)

    try {
      const aliases = readAliases()
      if (cleanAlias && cleanAlias !== record.titulo) aliases[key] = cleanAlias
      else delete aliases[key]
      localStorage.setItem(RECORDING_ALIASES_KEY, JSON.stringify(aliases))
      setAlias(aliases[key] || "")
      setDraftAlias(aliases[key] || record.titulo || "")
      setActionMessage(cleanAlias ? "Recording name saved in this browser." : "Original name restored.")
      setEditing(false)
    } catch {
      setActionMessage("This browser could not save the recording name.")
    }
  }

  const copySourceLink = async () => {
    if (!audioUrl) return
    try {
      await navigator.clipboard.writeText(audioUrl)
      setActionMessage("Direct recording link copied. Anyone with the link can open the audio.")
    } catch {
      setActionMessage("The direct recording link could not be copied.")
    }
  }

  const shareRecording = async () => {
    if (!audioUrl) return

    if (!navigator.share) {
      await copySourceLink()
      return
    }

    try {
      await navigator.share({
        title: displayTitle,
        text: "Listen to this recorded call.",
        url: audioUrl,
      })
      setActionMessage("Recording shared from its direct source.")
    } catch (shareError) {
      if (shareError?.name !== "AbortError") await copySourceLink()
    }
  }

  if (phase !== "ready" || !record) {
    const isLoading = phase === "loading"
    return (
      <main className="page product-page recording-detail recording-detail--state">
        <section className="surface recording-detail__state-card" aria-live="polite">
          <span className={`recording-detail__state-mark${isLoading ? " is-loading" : ""}`} aria-hidden="true">
            {isLoading ? <RefreshCw size={24} /> : <Headphones size={24} />}
          </span>
          <p className="eyebrow">Recording archive</p>
          <h1>{isLoading ? "Loading recording" : phase === "error" ? "Service unavailable" : "Recording not found"}</h1>
          <p>{isLoading ? "Matching this link to your saved call history..." : message}</p>
          {!isLoading && (
            <div className="recording-detail__state-actions">
              {phase === "error" && (
                <button className="button button--primary" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                  <RefreshCw size={15} aria-hidden="true" /> Retry
                </button>
              )}
              <button className="button button--outline" type="button" onClick={() => navigate("/activity")}>
                <ArrowLeft size={15} aria-hidden="true" /> Back to activity
              </button>
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="page product-page recording-detail">
      <nav className="recording-detail__breadcrumb" aria-label="Recording navigation">
        <button type="button" onClick={() => navigate("/activity")}>
          <ArrowLeft size={15} aria-hidden="true" /> Activity
        </button>
        <span aria-hidden="true">/</span>
        <span>Recording {record._id.slice(0, 8)}</span>
      </nav>

      <header className="recording-detail__hero">
        <div className="recording-detail__title-lockup">
          <ScenarioThumbnail
            src={record.pic}
            title={displayTitle}
            size="large"
            className="recording-detail__thumbnail"
            eager
          />
          <div>
            <div className="recording-detail__hero-line">
              <span className={statusClassName(record.status)}>
                <span aria-hidden="true" /> {formatStatus(record.status)}
              </span>
              <span>{record.accountCountry?.toUpperCase() || "--"}</span>
            </div>
            {editing ? (
              <form className="recording-detail__rename" onSubmit={saveAlias}>
                <label className="visually-hidden" htmlFor="recording-alias">Recording name</label>
                <input
                  id="recording-alias"
                  value={draftAlias}
                  maxLength={80}
                  autoFocus
                  onChange={(event) => setDraftAlias(event.target.value)}
                />
                <button type="submit" aria-label="Save recording name"><Check size={17} aria-hidden="true" /></button>
                <button type="button" aria-label="Cancel rename" onClick={() => { setDraftAlias(displayTitle); setEditing(false) }}>
                  <X size={17} aria-hidden="true" />
                </button>
              </form>
            ) : (
              <div className="recording-detail__title-row">
                <h1>{displayTitle}</h1>
                <button type="button" aria-label="Rename recording" onClick={() => setEditing(true)}>
                  <Pencil size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            <p>{record.targetName || "Unknown recipient"} · {formatTimestamp(record)}</p>
          </div>
        </div>

        <div className="recording-detail__actions">
          {audioUrl && (
            <>
              <button className="button button--primary" type="button" onClick={shareRecording}>
                <Share2 size={15} aria-hidden="true" /> Share recording
              </button>
              <a className="button button--outline" href={audioUrl} download target="_blank" rel="noreferrer">
                <Download size={15} aria-hidden="true" /> Download
              </a>
            </>
          )}
        </div>
      </header>

      <p className={`recording-detail__notice${actionMessage ? " is-visible" : ""}`} role="status" aria-live="polite">
        {actionMessage || "Recording actions will be confirmed here."}
      </p>

      <div className="recording-detail__grid">
        <section className="surface recording-detail__player" aria-labelledby="recording-player-heading">
          <div className="recording-detail__section-heading">
            <div>
              <p className="eyebrow">Returned audio</p>
              <h2 id="recording-player-heading">Call recording</h2>
            </div>
            <span><Link2 size={15} aria-hidden="true" /> Direct source link</span>
          </div>

          <div className={`recording-detail__waveform${audioUrl ? "" : " is-muted"}`} aria-hidden="true">
            {waveform.map((height, index) => (
              <i key={index} style={{ "--wave-height": `${height}%` }} />
            ))}
          </div>

          {audioUrl ? (
            <audio controls preload="metadata" src={audioUrl} aria-label={`Recording for ${displayTitle}`} />
          ) : (
            <div className="recording-detail__pending" role="status">
              <Headphones size={19} aria-hidden="true" />
              <div>
                <strong>Audio is not available yet</strong>
                <p>The task can still be active or may have ended without a returned recording.</p>
              </div>
            </div>
          )}
        </section>

        <aside className="surface recording-detail__metadata" aria-labelledby="recording-metadata-heading">
          <div className="recording-detail__section-heading">
            <div>
              <p className="eyebrow">Call record</p>
              <h2 id="recording-metadata-heading">Details</h2>
            </div>
          </div>
          <dl>
            <div><dt><UserRound size={15} aria-hidden="true" /> Recipient</dt><dd>{record.targetName || "Not stored"}</dd></div>
            <div><dt><Headphones size={15} aria-hidden="true" /> Number</dt><dd>{record.targetPhone || "Not stored"}</dd></div>
            <div><dt><Globe2 size={15} aria-hidden="true" /> Locale</dt><dd>{record.accountCountry?.toUpperCase() || "Unknown"}</dd></div>
            <div><dt><CalendarClock size={15} aria-hidden="true" /> Created</dt><dd>{formatTimestamp(record)}</dd></div>
            <div><dt><ShieldCheck size={15} aria-hidden="true" /> Record ID</dt><dd title={record._id}>{record._id}</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  )
}
