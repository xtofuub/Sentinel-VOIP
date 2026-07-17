import { createElement, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Headphones,
  PhoneCall,
  Play,
} from "@/components/icons"
import { Link } from "react-router-dom"
import { LocaleFlag } from "@/components/LocaleFlag"
import { ScenarioThumbnail } from "@/components/ScenarioThumbnail"
import { useCatalog } from "@/hooks/useCatalog"
import { useAuth } from "@/state/AuthContext"
import "./Overview.css"

const FALLBACK_SCENARIO_COUNT = 2129
const FALLBACK_LOCALE_COUNT = 64

const readStoredArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const readLocalOverview = () => ({
  accounts: readStoredArray("activeAccounts"),
  launches: readStoredArray("recordingTargetMemory"),
})

const journey = [
  {
    title: "Pick the prank",
    detail: "Browse and preview the scenario first.",
    icon: BookOpen,
  },
  {
    title: "Sentinel calls",
    detail: "Add their number and choose when it fires.",
    icon: PhoneCall,
  },
  {
    title: "Keep the reaction",
    detail: "The recording returns to your activity.",
    icon: Headphones,
  },
]

const waveform = [
  18, 34, 58, 42, 76, 91, 64, 37, 52, 82, 68, 29, 44, 73, 96, 61, 38, 56, 88, 70, 46, 24, 50, 78,
  59, 35, 66, 86, 48, 30, 54, 72,
]
const waveformStyles = waveform.map((height, index) => ({
  "--wave-height": `${height}%`,
  "--wave-delay": `${index * -55}ms`,
}))
const compactWaveformStyles = waveformStyles.slice(0, 20).map((style, index) => ({
  ...style,
  "--wave-delay": `${index * -70}ms`,
}))
const loadingScenarioRows = [0, 1, 2]

export function Overview() {
  const { isAdmin } = useAuth()
  const { error, loading, locales, scenarios } = useCatalog()
  const [localState, setLocalState] = useState(readLocalOverview)
  const heroRef = useRef(null)

  useEffect(() => {
    const refreshLocalState = () => setLocalState(readLocalOverview())
    window.addEventListener("focus", refreshLocalState)
    window.addEventListener("storage", refreshLocalState)
    return () => {
      window.removeEventListener("focus", refreshLocalState)
      window.removeEventListener("storage", refreshLocalState)
    }
  }, [])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined

    let frameId = 0
    const setPointer = (x, y) => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        hero.style.setProperty("--pointer-x", `${(x * 38).toFixed(2)}px`)
        hero.style.setProperty("--pointer-y", `${(y * 28).toFixed(2)}px`)
        hero.style.setProperty("--pointer-x-reverse", `${(x * -34).toFixed(2)}px`)
        hero.style.setProperty("--pointer-y-reverse", `${(y * -25).toFixed(2)}px`)
      })
    }
    const handlePointerMove = (event) => {
      const bounds = hero.getBoundingClientRect()
      setPointer((event.clientX - bounds.left) / bounds.width - 0.5, (event.clientY - bounds.top) / bounds.height - 0.5)
    }
    const resetPointer = () => setPointer(0, 0)

    hero.addEventListener("pointermove", handlePointerMove, { passive: true })
    hero.addEventListener("pointerleave", resetPointer)
    return () => {
      window.cancelAnimationFrame(frameId)
      hero.removeEventListener("pointermove", handlePointerMove)
      hero.removeEventListener("pointerleave", resetPointer)
    }
  }, [])

  const catalogSummary = useMemo(() => {
    const scenarioCount = scenarios.length || FALLBACK_SCENARIO_COUNT
    const localeCount = locales.length || FALLBACK_LOCALE_COUNT
    return {
      scenarioLabel: scenarioCount.toLocaleString(),
      localeLabel: localeCount.toLocaleString(),
    }
  }, [locales.length, scenarios.length])

  const featuredScenarios = useMemo(() => {
    const preferred = scenarios.filter((scenario) => scenario.localeLabel === "United States")
    return (preferred.length >= 3 ? preferred : scenarios).slice(0, 3)
  }, [scenarios])

  const selectedScenario = featuredScenarios[0]
  const savedCallCount = localState.launches.length

  return (
    <main className="cinematic-landing">
      <section className="cinematic-hero" ref={heroRef} aria-labelledby="cinematic-hero-title">
        <div className="cinematic-hero__backdrop" aria-hidden="true">
          <img className="cinematic-hero__atmosphere" src="/visuals/atmosphere.png" alt="" loading="eager" />
          <div className="cinematic-hero__shade" />
          <span className="cinematic-hero__wordmark">SENTINEL</span>
        </div>

        <div className="cinematic-hand-field cinematic-hand-field--left" aria-hidden="true">
          <img src="/visuals/hand-left.png" alt="" loading="eager" />
        </div>
        <div className="cinematic-hand-field cinematic-hand-field--right" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="eager" />
        </div>

        <div className="cinematic-shell cinematic-hero__inner">
          <div className="cinematic-hero__brandline">
            <span className="cinematic-hero__monogram" aria-hidden="true">S</span>
            <span>Sentinel prank call studio</span>
            <span className="cinematic-hero__status"><i />Control room online</span>
          </div>

          <h1 id="cinematic-hero-title">
            <span>Prank calls,</span>
            <span>on command.</span>
          </h1>
          <p className="cinematic-hero__promise">Every reaction, ready to replay.</p>
          <p className="cinematic-hero__copy">
            Pick a scenario, enter their number, and choose when it calls. Sentinel places the prank and brings the
            recording back to one private activity feed.
          </p>

          <div className="cinematic-hero__actions">
            <Link className="cinematic-button cinematic-button--light" to="/new">
              Start a prank
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="cinematic-button cinematic-button--quiet" to="/library">
              Browse {catalogSummary.scenarioLabel} scenarios
            </Link>
          </div>
          <p className="cinematic-hero__access">Browse freely. Sign in only when you are ready to place the call.</p>

          <ol className="cinematic-route" aria-label="How Sentinel works">
            {journey.map(({ detail, icon, title }, index) => (
              <li key={title}>
                <span className="cinematic-route__index">0{index + 1}</span>
                <span className="cinematic-route__icon" aria-hidden="true">
                  {createElement(icon, { size: 19, strokeWidth: 1.7 })}
                </span>
                <span className="cinematic-route__copy">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                {index < journey.length - 1 && <ArrowRight className="cinematic-route__arrow" size={16} aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cinematic-sequence" aria-labelledby="sequence-title">
        <div className="cinematic-shell">
          <header className="cinematic-intro">
            <p className="cinematic-intro__label">The whole prank. One continuous flow.</p>
            <div>
              <h2 id="sequence-title">You set the scene.<br />Sentinel handles the call.</h2>
              <p>
                No jumping between tools. The scenario, recipient, schedule, and returned recording stay connected
                from the first preview to the final replay.
              </p>
            </div>
          </header>

          <div className="cinematic-console">
            <div className="cinematic-console__topbar">
              <div>
                <span className="cinematic-console__mark">S.</span>
                <span>Session builder</span>
              </div>
              <span className="cinematic-console__ready"><i />Ready to configure</span>
            </div>

            <div className="cinematic-console__progress" aria-hidden="true">
              <span className="is-complete" />
              <span className="is-active" />
              <span />
              <i />
            </div>

            <div className="cinematic-console__body">
              <section className="cinematic-console__scenarios" aria-labelledby="scenario-preview-title">
                <div className="cinematic-console__section-head">
                  <span>01</span>
                  <div>
                    <h3 id="scenario-preview-title">Choose the prank</h3>
                    <p>{catalogSummary.scenarioLabel} scenarios · {catalogSummary.localeLabel} locales</p>
                  </div>
                </div>

                <div className="cinematic-scenario-list">
                  {loading && loadingScenarioRows.map((index) => (
                    <div className="cinematic-scenario is-loading" key={index} aria-hidden="true">
                      <span className="cinematic-scenario__placeholder" />
                      <span><i /><i /></span>
                    </div>
                  ))}
                  {!loading && featuredScenarios.map((scenario, index) => (
                    <article className={`cinematic-scenario${index === 0 ? " is-selected" : ""}`} key={scenario.uniqueId}>
                      <ScenarioThumbnail src={scenario.image_url} title={scenario.titulo} size="medium" eager={index === 0} />
                      <div className="cinematic-scenario__copy">
                        <span><LocaleFlag code={scenario.countryCode} eager={index === 0} />{scenario.localeLabel}</span>
                        <strong>{scenario.titulo}</strong>
                      </div>
                      {index === 0 ? <CheckCircle2 size={19} aria-label="Selected" /> : <Play size={17} aria-label="Preview" />}
                    </article>
                  ))}
                </div>
              </section>

              <section className="cinematic-console__dispatch" aria-labelledby="dispatch-title">
                <div className="cinematic-console__section-head">
                  <span>02</span>
                  <div>
                    <h3 id="dispatch-title">Set the moment</h3>
                    <p>Recipient and timing</p>
                  </div>
                </div>

                <div className="cinematic-dispatch-card">
                  <div className="cinematic-dispatch-card__scenario">
                    <span>Selected scenario</span>
                    <strong>{selectedScenario?.titulo || "The pizza delivery"}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Recipient</dt>
                      <dd>Alex · +1 ••• ••• 0194</dd>
                    </div>
                    <div>
                      <dt>Call time</dt>
                      <dd>Tonight · 20:30</dd>
                    </div>
                  </dl>
                  <div className="cinematic-dispatch-card__button">
                    <PhoneCall size={18} aria-hidden="true" />
                    Review and place call
                  </div>
                </div>
              </section>

              <section className="cinematic-console__return" aria-labelledby="return-title">
                <div className="cinematic-console__section-head">
                  <span>03</span>
                  <div>
                    <h3 id="return-title">Get the reaction</h3>
                    <p>Saved automatically in Activity</p>
                  </div>
                </div>

                <div className="cinematic-return-card">
                  <div className="cinematic-return-card__status">
                    <span><i />Recording ready</span>
                    <time>00:47</time>
                  </div>
                  <div className="cinematic-waveform" aria-hidden="true">
                    {compactWaveformStyles.map((style, index) => (
                      <i key={index} style={style} />
                    ))}
                  </div>
                  <div className="cinematic-return-card__play">
                    <span><Play size={16} aria-hidden="true" /></span>
                    <div>
                      <strong>Replay the reaction</strong>
                      <small>Recipient, scenario, and time included</small>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {error && (
            <p className="cinematic-data-note" role="status">
              The live catalog could not load in this view. Your saved browser activity is still available.
            </p>
          )}
        </div>
      </section>

      <section className="cinematic-reaction" aria-labelledby="reaction-title">
        <div className="cinematic-reaction__glow" aria-hidden="true" />
        <div className="cinematic-shell cinematic-reaction__layout">
          <div className="cinematic-reaction__copy">
            <p>The part worth keeping</p>
            <h2 id="reaction-title">The call ends.<br />The story doesn’t.</h2>
            <p>
              Activity keeps every returned recording with the right prank, recipient, and time—ready to replay
              whenever the joke comes back up.
            </p>
            <Link className="cinematic-text-link" to="/activity">
              Open activity
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="cinematic-recording" aria-label="Example returned recording">
            <div className="cinematic-recording__header">
              <span>Returned reaction</span>
              <span className="cinematic-recording__badge"><i />Ready</span>
            </div>
            <div className="cinematic-recording__identity">
              <div className="cinematic-recording__play"><Play size={22} aria-hidden="true" /></div>
              <div>
                <strong>{selectedScenario?.titulo || "The pizza delivery"}</strong>
                <span>Alex · Tonight at 20:30</span>
              </div>
              <time>00:47</time>
            </div>
            <div className="cinematic-recording__wave" aria-hidden="true">
              {waveformStyles.map((style, index) => (
                <i key={index} style={style} />
              ))}
            </div>
            <div className="cinematic-recording__footer">
              <span>{savedCallCount ? `${savedCallCount.toLocaleString()} saved in this browser` : "Your recordings collect here"}</span>
              <span>Private activity trail</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cinematic-final" aria-labelledby="final-title">
        <div className="cinematic-final__hand" aria-hidden="true">
          <img src="/visuals/hand-right.png" alt="" loading="lazy" />
        </div>
        <div className="cinematic-shell cinematic-final__inner">
          <p>Ready when the timing is right.</p>
          <h2 id="final-title">Choose the prank.<br />Keep the reaction.</h2>
          <div className="cinematic-final__actions">
            <Link className="cinematic-button cinematic-button--dark" to="/new">
              Start a prank
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="cinematic-final__browse" to="/library">Explore the scenario library</Link>
          </div>
        </div>
      </section>

      <footer className="cinematic-footer">
        <div className="cinematic-shell cinematic-footer__inner">
          <Link className="cinematic-footer__brand" to="/" aria-label="Sentinel home">Sentinel<span>.</span></Link>
          <nav aria-label="Footer navigation">
            <Link to="/library">Library</Link>
            <Link to="/new">Console</Link>
            <Link to="/activity">Activity</Link>
            {isAdmin && <Link to="/logs"><FileText size={14} aria-hidden="true" />API logs</Link>}
          </nav>
          <p>Use Sentinel only with permission and for a lawful purpose.</p>
          <span>© {new Date().getFullYear()} Sentinel VOIP</span>
        </div>
      </footer>
    </main>
  )
}
