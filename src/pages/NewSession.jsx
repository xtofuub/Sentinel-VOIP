import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Pause,
  PhoneOutgoing,
  Play,
  Search,
  ShieldCheck,
  Volume2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { AuthPromptDialog } from "@/components/AuthPromptDialog"
import { LocalePicker } from "@/components/LocalePicker"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { useApp } from "@/state/AppContext"
import { useAuth } from "@/state/AuthContext"
import {
  bootstrapNewSession,
  formatKoErrorMessage,
  generateTaskId,
  launchPrank,
  pushRecordingTargetMemory,
} from "@/services/api"

const formatTaskTimestamp = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0")
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const readActiveAccounts = () => {
  try {
    const value = JSON.parse(localStorage.getItem("activeAccounts") || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const sessionDraftKey = "sentinel-session-draft"

const readSessionDraft = () => {
  try {
    const draft = JSON.parse(sessionStorage.getItem(sessionDraftKey) || "{}")
    return {
      recipientName: typeof draft.recipientName === "string" ? draft.recipientName : "",
      phoneNumber: typeof draft.phoneNumber === "string" ? draft.phoneNumber : "",
    }
  } catch {
    return { recipientName: "", phoneNumber: "" }
  }
}

export function NewSession() {
  const { loading, error, locales, scenarios } = useCatalog()
  const { selectedScenario, setSelectedScenario } = useApp()
  const { isSuspended, user } = useAuth()
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const [draft] = useState(() => readSessionDraft())
  const [localeId, setLocaleId] = useState(selectedScenario?.localeId || "")
  const [scenarioQuery, setScenarioQuery] = useState("")
  const [playingId, setPlayingId] = useState(null)
  const [previewError, setPreviewError] = useState("")
  const [recipientName, setRecipientName] = useState(draft.recipientName)
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [stage, setStage] = useState("")

  useEffect(() => {
    if (selectedScenario?.localeId) setLocaleId(selectedScenario.localeId)
  }, [selectedScenario])

  useEffect(() => () => {
    audioRef.current?.pause()
  }, [])

  const localeScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.localeId === localeId),
    [localeId, scenarios],
  )

  const filteredScenarios = useMemo(() => {
    const normalized = scenarioQuery.trim().toLowerCase()
    if (!normalized) return localeScenarios

    return localeScenarios.filter((scenario) => (
      scenario.titulo?.toLowerCase().includes(normalized)
      || scenario.desc?.toLowerCase().includes(normalized)
    ))
  }, [localeScenarios, scenarioQuery])

  const stopPreview = () => {
    audioRef.current?.pause()
    setPlayingId(null)
  }

  const handleLocaleChange = (nextLocaleId) => {
    stopPreview()
    setLocaleId(nextLocaleId)
    setScenarioQuery("")
    setSelectedScenario(null)
    setPreviewError("")
  }

  const chooseScenario = (scenario) => {
    setSelectedScenario(scenario)
    setNotice(null)
  }

  const togglePreview = (scenario) => {
    const audio = audioRef.current
    if (!audio || !scenario.example) return

    setPreviewError("")
    if (playingId === scenario.uniqueId) {
      stopPreview()
      return
    }

    audio.src = scenario.example
    audio.currentTime = 0
    const previewSrc = audio.src
    setPlayingId(scenario.uniqueId)
    audio.play().catch((playError) => {
      if (playError?.name === "AbortError" || audioRef.current?.src !== previewSrc) return
      setPlayingId(null)
      setPreviewError("Audio preview could not be loaded.")
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    const cleanName = recipientName.trim()
    const cleanPhone = phoneNumber.trim()
    if (!selectedScenario || !cleanName || !cleanPhone || submitting) return

    if (!user) {
      try {
        sessionStorage.setItem(sessionDraftKey, JSON.stringify({ recipientName: cleanName, phoneNumber: cleanPhone }))
      } catch {
        // The sign-in prompt still works when draft storage is unavailable.
      }
      setAuthPromptOpen(true)
      return
    }

    if (isSuspended) {
      navigate("/account", { state: { suspended: true } })
      return
    }

    stopPreview()
    setSubmitting(true)
    setNotice(null)
    const taskId = generateTaskId()

    try {
      setStage("Creating backend identity")
      const { did, mongoUid } = await bootstrapNewSession(selectedScenario.countryCode)
      const taskTimestamp = formatTaskTimestamp()

      setStage("Creating call task")
      await launchPrank({
        _id: taskId,
        c: selectedScenario.countryCode,
        dial: selectedScenario._id,
        dst: cleanPhone,
        f: taskTimestamp,
        nombre: cleanName,
        real_f: taskTimestamp,
        titulo: selectedScenario.titulo,
        uid: did,
      })

      let historySaved = true

      try {
        pushRecordingTargetMemory({
          uid: did,
          dial: selectedScenario._id,
          targetName: cleanName,
          targetPhone: cleanPhone,
          taskId,
        })

        const activeAccounts = readActiveAccounts()
        const nextAccounts = [
          { did, uid: mongoUid, country: selectedScenario.countryCode, at: Date.now() },
          ...activeAccounts.filter((entry) => (entry?.did || entry?.uid) !== did),
        ]
        localStorage.setItem("activeAccounts", JSON.stringify(nextAccounts.slice(0, 30)))
      } catch {
        historySaved = false
      }

      setNotice({
        type: "success",
        text: historySaved
          ? `Task ${taskId.slice(0, 8)} was accepted by the backend.`
          : `Task ${taskId.slice(0, 8)} was accepted, but this browser could not save it to Activity.`,
      })
      setStage("")
      setRecipientName("")
      setPhoneNumber("")
      try {
        sessionStorage.removeItem(sessionDraftKey)
      } catch {
        // No cleanup is needed when session storage is unavailable.
      }
    } catch (requestError) {
      setNotice({
        type: "error",
        text: formatKoErrorMessage(requestError) || "The backend task could not be created.",
      })
      setStage("")
    } finally {
      setSubmitting(false)
    }
  }

  const formIsIncomplete = !selectedScenario || !recipientName.trim() || !phoneNumber.trim()
  const completion = [selectedScenario, recipientName.trim(), phoneNumber.trim()].filter(Boolean).length

  return (
    <main className="page product-page session-page">
      <header className="product-hero product-hero--compact">
        <div className="product-hero__index" aria-hidden="true">02</div>
        <div className="product-hero__copy">
          <p className="eyebrow">Session workbench</p>
          <h1>
            Choose. Compose.
            <br />
            <em>Launch in one place.</em>
          </h1>
          <p>Preview the scenario, add the recipient, inspect the payload, and send the existing backend task.</p>
        </div>
        <div className="product-hero__meta" aria-label="Launch readiness">
          <span>Launch readiness</span>
          <strong>{completion}/3</strong>
          <small>inputs complete</small>
        </div>
      </header>

      <section className="surface session-workbench" aria-label="New session workspace">
        <div className="scenario-browser">
          <header className="workbench-heading">
            <div>
              <span className="surface-index">01</span>
              <div>
                <p className="eyebrow">Scenario</p>
                <h2>Pick the right voice</h2>
              </div>
            </div>
            <button className="button button--quiet button--compact" type="button" onClick={() => navigate("/library")}>
              Full library
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </header>

          <div className="scenario-browser__controls">
            <LocalePicker
              id="session-locale"
              label="Language & region"
              value={localeId}
              options={locales}
              onChange={handleLocaleChange}
              placeholder={loading ? "Loading locales" : "Choose a language"}
              disabled={loading || submitting}
            />

            <label className="field field--search" htmlFor="session-scenario-search">
              <span>Search scenarios</span>
              <span className="control-input-wrap">
                <Search aria-hidden="true" size={17} strokeWidth={1.5} />
                <input
                  id="session-scenario-search"
                  type="search"
                  value={scenarioQuery}
                  onChange={(event) => setScenarioQuery(event.target.value)}
                  placeholder="Title or description"
                  disabled={!localeId || submitting}
                />
              </span>
            </label>
          </div>

          <audio
            ref={audioRef}
            className="visually-hidden"
            onEnded={() => setPlayingId(null)}
            onError={() => {
              setPlayingId(null)
              setPreviewError("Audio preview could not be loaded.")
            }}
          />

          <div className="scenario-browser__status" aria-live="polite">
            {localeId && !loading && (
              <span>{filteredScenarios.length.toLocaleString()} scenario{filteredScenarios.length === 1 ? "" : "s"}</span>
            )}
            {selectedScenario && <span>Selected: {selectedScenario.titulo}</span>}
          </div>

          {error ? (
            <div className="notice notice-error" role="alert">
              <CircleAlert size={18} aria-hidden="true" />
              <p>The catalog could not be loaded.</p>
            </div>
          ) : previewError ? (
            <div className="notice notice-error" role="alert">
              <Volume2 size={18} aria-hidden="true" />
              <p>{previewError}</p>
            </div>
          ) : null}

          <div className="scenario-options" role="group" aria-label="Available scenarios">
            {!localeId ? (
              <div className="scenario-options__empty">
                <span>01</span>
                <p>Choose a locale to open its scenario set.</p>
              </div>
            ) : loading ? (
              <div className="loading-state" role="status">
                <span className="loading-mark" aria-hidden="true" />
                <p>Loading scenarios...</p>
              </div>
            ) : filteredScenarios.length ? (
              filteredScenarios.map((scenario) => {
                const isSelected = selectedScenario?.uniqueId === scenario.uniqueId
                const isPlaying = playingId === scenario.uniqueId

                return (
                  <article className={`scenario-option${isSelected ? " is-selected" : ""}`} key={scenario.uniqueId}>
                    <button
                      className="scenario-option__select"
                      type="button"
                      onClick={() => chooseScenario(scenario)}
                      aria-pressed={isSelected}
                      disabled={submitting}
                    >
                      <ScenarioThumbnail src={scenario.image_url} title={scenario.titulo} size="medium" />
                      <span className="scenario-option__copy">
                        <strong>{scenario.titulo}</strong>
                        <span>{scenario.desc || "No description available."}</span>
                      </span>
                      <span className="scenario-option__check" aria-hidden="true">
                        {isSelected ? <Check size={15} /> : null}
                      </span>
                    </button>
                    <button
                      className="scenario-option__preview"
                      type="button"
                      onClick={() => togglePreview(scenario)}
                      disabled={!scenario.example || submitting}
                      aria-label={`${isPlaying ? "Pause" : "Preview"} ${scenario.titulo}`}
                    >
                      {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      {isPlaying ? "Pause" : "Preview"}
                    </button>
                  </article>
                )
              })
            ) : (
              <div className="scenario-options__empty">
                <span>00</span>
                <p>No scenarios match this search.</p>
              </div>
            )}
          </div>
        </div>

        <form className="session-composer" onSubmit={submit}>
          <header className="workbench-heading session-composer__heading">
            <div>
              <span className="surface-index">02</span>
              <div>
                <p className="eyebrow">Compose</p>
                <h2>Review and launch</h2>
              </div>
            </div>
            <span className={`badge ${formIsIncomplete ? "badge--neutral" : "badge--live"}`}>
              <span className="badge__dot" aria-hidden="true" />
              {formIsIncomplete ? "Incomplete" : "Ready"}
            </span>
          </header>

          <div className={`selected-scenario${selectedScenario ? " has-selection" : ""}`}>
            {selectedScenario ? (
              <>
                <ScenarioThumbnail
                  src={selectedScenario.image_url}
                  title={selectedScenario.titulo}
                  size="large"
                  eager
                />
                <div>
                  <span>{selectedScenario.localeLabel}</span>
                  <strong>{selectedScenario.titulo}</strong>
                  <p>{selectedScenario.desc || "No description available."}</p>
                </div>
              </>
            ) : (
              <>
                <span className="selected-scenario__empty" aria-hidden="true">01</span>
                <div>
                  <strong>No scenario selected</strong>
                  <p>Your chosen voice and payload details appear here.</p>
                </div>
              </>
            )}
          </div>

          <div className="session-recipient-fields">
            <label className="field" htmlFor="session-recipient-name">
              <span>Recipient name</span>
              <input
                id="session-recipient-name"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="Name"
                autoComplete="off"
                disabled={submitting}
              />
            </label>

            <label className="field" htmlFor="session-phone-number">
              <span>Phone number</span>
              <input
                id="session-phone-number"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+358..."
                type="tel"
                autoComplete="tel"
                disabled={submitting}
              />
            </label>
          </div>

          {selectedScenario && (
            <details className="technical-details">
              <summary>Technical payload details</summary>
              <dl>
                <div><dt>Country</dt><dd><code>{selectedScenario.countryCode}</code></dd></div>
                <div><dt>Scenario ID</dt><dd><code>{selectedScenario._id}</code></dd></div>
                <div><dt>Locale</dt><dd>{selectedScenario.localeLabel}</dd></div>
              </dl>
            </details>
          )}

          <div className="notice notice-lawful session-lawful">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Only use the service where you have permission and a lawful purpose.</p>
          </div>

          <div className="launch-status" aria-live="polite">
            {submitting ? (
              <div className="launch-status__message is-loading" role="status">
                <LoaderCircle className="spin" size={18} aria-hidden="true" />
                <div><strong>Sending task</strong><p>{stage}</p></div>
              </div>
            ) : notice?.type === "success" ? (
              <div className="launch-status__message is-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <div><strong>Task accepted</strong><p>{notice.text}</p></div>
                <button className="button button--quiet button--compact" type="button" onClick={() => navigate("/activity")}>
                  Activity <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : notice?.type === "error" ? (
              <div className="launch-status__message is-error" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <div><strong>Task failed</strong><p>{notice.text}</p></div>
              </div>
            ) : (
              <div className="launch-status__placeholder">
                <span>03</span>
                <p>Complete the three inputs to enable launch.</p>
              </div>
            )}
          </div>

          <button
            className="button button--primary session-launch-button"
            type="submit"
            disabled={formIsIncomplete || submitting}
          >
            {submitting ? stage : "Place call"}
            {!submitting && <PhoneOutgoing size={17} aria-hidden="true" />}
          </button>
        </form>
      </section>
      <AuthPromptDialog open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
    </main>
  )
}
