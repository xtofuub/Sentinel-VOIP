import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Pause,
  PhoneCall,
  PhoneOutgoing,
  Play,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  Volume2,
} from "@/components/icons"
import { useNavigate } from "react-router-dom"
import { AuthPromptDialog } from "@/components/AuthPromptDialog"
import { ContactsDialog } from "@/components/ContactsDialog"
import { LocalePicker } from "@/components/LocalePicker"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { useApp } from "@/state/AppContext"
import { useAuth } from "@/state/AuthContext"
import { createCallSession, dispatchCallSession } from "@/services/callSessions"
import { isValidContactPhone, normalizeContactPhone, rememberContact } from "@/services/contacts"

const sessionDraftKey = "sentinel-session-draft"

const toDateTimeInputValue = (date) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

const scheduleMin = () => toDateTimeInputValue(new Date(Date.now() + 2 * 60_000))
const scheduleMax = () => toDateTimeInputValue(new Date(Date.now() + 30 * 24 * 60 * 60_000))
const scheduleTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time"

const formatScheduledTime = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value))

const formatSessionError = (error) => {
  const message = String(error?.message || "").trim()
  if (/No call credits remaining/i.test(message)) return "You have no call credits remaining."
  if (/Scheduled time/i.test(message)) return "Choose a time within the next 30 days."
  if (/Authentication required|JWT/i.test(message)) return "Your session expired. Sign in again and retry."
  return message || "The call could not be queued."
}

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
  const { isSuspended, refreshProfile, user } = useAuth()
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const [draft] = useState(() => readSessionDraft())
  const [localeId, setLocaleId] = useState(selectedScenario?.localeId || "")
  const [scenarioQuery, setScenarioQuery] = useState("")
  const [playingId, setPlayingId] = useState(null)
  const [previewError, setPreviewError] = useState("")
  const [recipientName, setRecipientName] = useState(draft.recipientName)
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [timingMode, setTimingMode] = useState("now")
  const [scheduledFor, setScheduledFor] = useState("")
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [authPromptReason, setAuthPromptReason] = useState("call")
  const [contactsOpen, setContactsOpen] = useState(false)
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

  const chooseTimingMode = (mode) => {
    setTimingMode(mode)
    setNotice(null)
    if (mode === "scheduled" && !scheduledFor) {
      setScheduledFor(toDateTimeInputValue(new Date(Date.now() + 15 * 60_000)))
    }
  }

  const chooseDelay = (minutes) => {
    setTimingMode("scheduled")
    setScheduledFor(toDateTimeInputValue(new Date(Date.now() + minutes * 60_000)))
    setNotice(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    const cleanName = recipientName.trim()
    const cleanPhone = normalizeContactPhone(phoneNumber)
    if (!selectedScenario || !cleanName || !cleanPhone || submitting) return

    if (!isValidContactPhone(cleanPhone)) {
      setPhoneTouched(true)
      setNotice({
        type: "error",
        text: "Use a full international number with country code, such as +14155550123.",
      })
      return
    }

    const scheduledDate = timingMode === "scheduled" ? new Date(scheduledFor) : new Date()
    if (Number.isNaN(scheduledDate.getTime())) {
      setNotice({ type: "error", text: "Choose a valid date and time." })
      return
    }
    if (timingMode === "scheduled" && scheduledDate.getTime() < Date.now() + 60_000) {
      setNotice({ type: "error", text: "Scheduled calls need at least one minute of lead time." })
      return
    }
    if (scheduledDate.getTime() > Date.now() + 30 * 24 * 60 * 60_000) {
      setNotice({ type: "error", text: "Calls can be scheduled up to 30 days ahead." })
      return
    }

    if (!user) {
      try {
        sessionStorage.setItem(sessionDraftKey, JSON.stringify({ recipientName: cleanName, phoneNumber: cleanPhone }))
      } catch {
        // The sign-in prompt still works when draft storage is unavailable.
      }
      setAuthPromptReason("call")
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
    const requestId = crypto.randomUUID()

    try {
      setStage(timingMode === "scheduled" ? "Saving schedule" : "Queuing call")
      const session = await createCallSession({
        requestId,
        scenarioId: selectedScenario._id,
        scenarioTitle: selectedScenario.titulo,
        localeCode: selectedScenario.countryCode,
        recipientName: cleanName,
        recipientPhone: cleanPhone,
        scheduledFor: scheduledDate.toISOString(),
      })

      let contactSaved = true
      let dispatchDelayed = false

      if (timingMode === "now") {
        setStage("Connecting call")
        try {
          await dispatchCallSession(session.id)
        } catch {
          dispatchDelayed = true
        }
      }

      try {
        await rememberContact({
          userId: user.id,
          name: cleanName,
          phoneNumber: cleanPhone,
        })
      } catch {
        contactSaved = false
      }

      setNotice({
        type: "success",
        title: timingMode === "scheduled" ? "Call scheduled" : "Call queued",
        text: timingMode === "scheduled"
          ? `${formatScheduledTime(scheduledDate)}${contactSaved ? ". Recipient saved to Contacts." : "."}`
          : dispatchDelayed
            ? "Saved safely. The dispatcher will retry within a minute."
            : contactSaved
              ? "Connecting now. Recipient saved to Contacts."
              : "Connecting now. The recipient could not be saved to Contacts.",
      })
      void refreshProfile()
      setStage("")
      setRecipientName("")
      setPhoneNumber("")
      setPhoneTouched(false)
      setTimingMode("now")
      setScheduledFor("")
      try {
        sessionStorage.removeItem(sessionDraftKey)
      } catch {
        // No cleanup is needed when session storage is unavailable.
      }
    } catch (requestError) {
      setNotice({
        type: "error",
        text: formatSessionError(requestError),
      })
      setStage("")
    } finally {
      setSubmitting(false)
    }
  }

  const formIsIncomplete = !selectedScenario
    || !recipientName.trim()
    || !phoneNumber.trim()
    || (timingMode === "scheduled" && !scheduledFor)

  const openContacts = () => {
    if (!user) {
      setAuthPromptReason("contacts")
      setAuthPromptOpen(true)
      return
    }
    setContactsOpen(true)
  }

  const chooseContact = (contact) => {
    setRecipientName(contact.name)
    setPhoneNumber(contact.phoneNumber)
    setPhoneTouched(false)
    setNotice(null)
  }

  return (
    <main className="page product-page session-page">
      <header className="console-header">
        <div className="console-header__copy">
          <h1>New call</h1>
          <p>Select a scenario, then add the recipient.</p>
        </div>
      </header>

      <section className="session-workbench" aria-label="New call workspace">
        <div className="scenario-browser">
          <header className="workbench-heading">
            <div>
              <span className="surface-index" aria-hidden="true"><Volume2 size={15} /></span>
              <div>
                <p className="console-section-label">Scenario library</p>
                <h2>Choose a scenario</h2>
              </div>
            </div>
            <button className="button button--quiet button--compact" type="button" onClick={() => navigate("/library")}>
              Open library
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
                <span aria-hidden="true"><Volume2 size={30} /></span>
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
                <span aria-hidden="true"><Search size={30} /></span>
                <p>No scenarios match this search.</p>
              </div>
            )}
          </div>
        </div>

        <form className="session-composer" onSubmit={submit}>
          <header className="workbench-heading session-composer__heading">
            <div>
              <div>
                <h2>Call details</h2>
                <p>Add the person receiving the call.</p>
              </div>
            </div>
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
              <div className="selected-scenario__placeholder">
                <strong>No scenario selected</strong>
                <p>Choose one from the list to continue.</p>
              </div>
            )}
          </div>

          <section className="recipient-details" aria-labelledby="recipient-details-title">
            <header className="recipient-details__header">
              <span className="recipient-details__icon" aria-hidden="true"><UserRound size={17} /></span>
              <div className="recipient-details__heading-copy">
                <p>Recipient</p>
                <h3 id="recipient-details-title">Who receives this call?</h3>
              </div>
              <button className="contact-book-trigger" type="button" onClick={openContacts} disabled={submitting}>
                <UsersRound size={16} aria-hidden="true" />
                Contacts
              </button>
            </header>

            <div className="session-recipient-fields">
              <label className="recipient-field" htmlFor="session-recipient-name">
                <span>Name</span>
                <div className="recipient-field__control">
                  <UserRound size={16} aria-hidden="true" />
                  <input
                    id="session-recipient-name"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Their name"
                    autoComplete="off"
                    disabled={submitting}
                  />
                </div>
              </label>

              <label className="recipient-field" htmlFor="session-phone-number">
                <span>Phone</span>
                <div className="recipient-field__control">
                  <PhoneCall size={16} aria-hidden="true" />
                  <input
                    id="session-phone-number"
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value)
                      if (phoneTouched) setPhoneTouched(false)
                    }}
                    onBlur={(event) => {
                      const normalized = normalizeContactPhone(event.target.value)
                      setPhoneNumber(normalized)
                      setPhoneTouched(Boolean(normalized) && !isValidContactPhone(normalized))
                    }}
                    placeholder="Country code + number"
                    type="tel"
                    autoComplete="tel"
                    aria-invalid={phoneTouched}
                    aria-describedby="session-phone-hint"
                    disabled={submitting}
                  />
                </div>
              </label>
            </div>
            <div className={`recipient-details__note${phoneTouched ? " is-error" : ""}`} id="session-phone-hint">
              <span>{phoneTouched ? "Use + followed by country code and number." : "Use international format. Called recipients are saved to Contacts."}</span>
            </div>
          </section>

          <section className="schedule-details" aria-labelledby="schedule-details-title">
            <header className="schedule-details__header">
              <span className="recipient-details__icon" aria-hidden="true"><CalendarClock size={17} /></span>
              <div>
                <p>Timing</p>
                <h3 id="schedule-details-title">When should Sentinel call?</h3>
              </div>
            </header>

            <div className="schedule-mode" role="group" aria-label="Call timing">
              <button
                type="button"
                aria-pressed={timingMode === "now"}
                onClick={() => chooseTimingMode("now")}
                disabled={submitting}
              >
                <PhoneOutgoing size={15} aria-hidden="true" />
                Call now
              </button>
              <button
                type="button"
                aria-pressed={timingMode === "scheduled"}
                onClick={() => chooseTimingMode("scheduled")}
                disabled={submitting}
              >
                <Clock3 size={15} aria-hidden="true" />
                Schedule
              </button>
            </div>

            {timingMode === "scheduled" ? (
              <div className="schedule-picker">
                <label htmlFor="session-scheduled-for">
                  <span>Date and time</span>
                  <input
                    id="session-scheduled-for"
                    type="datetime-local"
                    value={scheduledFor}
                    min={scheduleMin()}
                    max={scheduleMax()}
                    step="60"
                    onChange={(event) => {
                      setScheduledFor(event.target.value)
                      setNotice(null)
                    }}
                    disabled={submitting}
                  />
                </label>
                <div className="schedule-presets" aria-label="Quick schedule options">
                  <button type="button" onClick={() => chooseDelay(15)} disabled={submitting}>In 15 min</button>
                  <button type="button" onClick={() => chooseDelay(60)} disabled={submitting}>In 1 hour</button>
                  <button type="button" onClick={() => chooseDelay(24 * 60)} disabled={submitting}>Tomorrow</button>
                </div>
                <p>Shown in {scheduleTimeZone}. The call fires from Supabase even if this page is closed.</p>
              </div>
            ) : (
              <p className="schedule-details__now">The call enters the queue as soon as you confirm.</p>
            )}
          </section>

          {selectedScenario && (
            <details className="technical-details">
              <summary>Scenario details</summary>
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
                <div><strong>Placing call</strong><p>{stage}</p></div>
              </div>
            ) : notice?.type === "success" ? (
              <div className="launch-status__message is-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <div><strong>{notice.title || "Call queued"}</strong><p>{notice.text}</p></div>
                <button className="button button--quiet button--compact" type="button" onClick={() => navigate("/activity")}>
                  Activity <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : notice?.type === "error" ? (
              <div className="launch-status__message is-error" role="alert">
                <CircleAlert size={18} aria-hidden="true" />
                <div><strong>Call not queued</strong><p>{notice.text}</p></div>
              </div>
            ) : (
              <div className="launch-status__placeholder">
                <span aria-hidden="true"><PhoneOutgoing size={24} /></span>
                <p>Choose a scenario and recipient to continue.</p>
              </div>
            )}
          </div>

          <button
            className="button button--primary session-launch-button"
            type="submit"
            disabled={formIsIncomplete || submitting}
          >
            {submitting ? stage : timingMode === "scheduled" ? "Schedule call" : "Place call"}
            {!submitting && <PhoneOutgoing size={17} aria-hidden="true" />}
          </button>
        </form>
      </section>
      <AuthPromptDialog
        open={authPromptOpen}
        reason={authPromptReason}
        onClose={() => setAuthPromptOpen(false)}
      />
      <ContactsDialog
        open={contactsOpen}
        userId={user?.id}
        onClose={() => setContactsOpen(false)}
        onChoose={chooseContact}
      />
    </main>
  )
}
