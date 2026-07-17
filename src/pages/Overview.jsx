import { createElement, useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  BookOpen,
  FileText,
  Headphones,
  PhoneCall,
  Search,
  UserRound,
} from "@/components/icons"
import { Link } from "react-router-dom"
import { useCatalog } from "@/hooks/useCatalog"
import { useAuth } from "@/state/AuthContext"

const FALLBACK_SCENARIO_COUNT = 2129

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

const workflowSteps = [
  {
    number: "01",
    title: "Choose the setup",
    description: "Search the catalog, hear the sample, and choose the prank that fits the moment.",
    result: "Scenario selected",
    icon: Search,
  },
  {
    number: "02",
    title: "Add the recipient",
    description: "Enter the name and number, then review the complete call setup before anything is sent.",
    result: "Details confirmed",
    icon: UserRound,
  },
  {
    number: "03",
    title: "Place the call",
    description: "Sentinel sends the selected scenario and keeps the call connected to its recipient and time.",
    result: "Call dispatched",
    icon: PhoneCall,
  },
  {
    number: "04",
    title: "Replay the reaction",
    description: "Open Activity to find the returned recording beside the same recipient and scenario.",
    result: "Recording ready",
    icon: Headphones,
  },
]

export function Overview() {
  const { isAdmin } = useAuth()
  const { error, loading, locales, scenarios } = useCatalog()
  const [localState, setLocalState] = useState(readLocalOverview)

  useEffect(() => {
    const refreshLocalState = () => setLocalState(readLocalOverview())
    window.addEventListener("focus", refreshLocalState)
    window.addEventListener("storage", refreshLocalState)
    return () => {
      window.removeEventListener("focus", refreshLocalState)
      window.removeEventListener("storage", refreshLocalState)
    }
  }, [])

  const catalogSummary = useMemo(() => {
    const scenarioCount = scenarios.length || FALLBACK_SCENARIO_COUNT
    const localeLabel = loading
      ? "the complete locale set"
      : `${locales.length.toLocaleString()} locales`

    return {
      scenarioCount,
      scenarioLabel: scenarioCount.toLocaleString(),
      localeLabel,
    }
  }, [loading, locales.length, scenarios.length])

  const stats = [
    {
      value: catalogSummary.scenarioLabel,
      label: "Prank scenarios",
      detail: "Ready to browse and preview",
    },
    {
      value: loading ? "..." : locales.length.toLocaleString(),
      label: "Languages & regions",
      detail: "Localized scenario collections",
    },
    {
      value: localState.accounts.length.toLocaleString(),
      label: "Call connections",
      detail: "Linked in this browser",
    },
    {
      value: localState.launches.length.toLocaleString(),
      label: "Saved calls",
      detail: "Remembered in Activity",
    },
  ]

  return (
    <main className="landing-page">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-background" aria-hidden="true">
          <img
            className="hero-atmosphere"
            src="/visuals/atmosphere.png"
            alt=""
            loading="eager"
          />
          <div className="hero-background__fade" />
        </div>

        <img
          className="hero-hand hero-hand--left"
          src="/visuals/hand-left.png"
          alt=""
          aria-hidden="true"
          loading="eager"
        />
        <img
          className="hero-hand hero-hand--right"
          src="/visuals/hand-right.png"
          alt=""
          aria-hidden="true"
          loading="eager"
        />

        <div className="hero-inner">
          <p className="hero-eyebrow">Sentinel / Prank call control room</p>
          <h1 className="hero-title" id="hero-title">
            Prank calls, on command.
            <span>Every reaction ready to replay.</span>
          </h1>
          <p className="hero-copy">
            Choose from {catalogSummary.scenarioLabel} localized prank scenarios across {catalogSummary.localeLabel},
            launch an authorized call, and return to the recording and activity in one place.
          </p>

          <div className="hero-actions">
            <Link className="hero-cta hero-cta--primary" to="/library">
              Browse prank scenarios
              <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <Link className="hero-cta hero-cta--secondary" to="/new">
              Start a prank
            </Link>
          </div>

          <div className="hero-meta" aria-label="Workspace capabilities">
            <span>2,129 ready-made scenarios</span>
            <span>64 localized collections</span>
            <span>Recorded reactions</span>
          </div>
        </div>
      </section>

      <section className="landing-mission" aria-labelledby="mission-title">
        <div className="landing-container landing-mission__intro">
          <p className="landing-kicker">From setup to replay</p>
          <h2 id="mission-title">One place for the setup, the call, and the reaction.</h2>
          <p>
            Choose the prank, add the recipient, place the call, and return to the recording without losing the thread.
          </p>
          {error && (
            <p className="landing-data-note" role="status">
              The local catalog could not be loaded in this view. Stored browser activity is still available.
            </p>
          )}
        </div>

        <div className="landing-container landing-stats" aria-label="Current workspace totals">
          {stats.map((stat) => (
            <article className="landing-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              <p>{stat.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-features" aria-labelledby="features-title">
        <div className="landing-container">
          <header className="landing-section-heading">
            <p className="landing-kicker">Two sides of the workspace</p>
            <h2 id="features-title">
              Find the right scenario.
              <span>Follow what happens next.</span>
            </h2>
          </header>

          <div className="feature-grid">
            <article className="feature-card feature-card--orange">
              <div className="feature-card__topline">
                <span className="feature-card__icon" aria-hidden="true">
                  <BookOpen size={24} strokeWidth={1.6} />
                </span>
                <span className="feature-card__index">01 / Discover</span>
              </div>
              <div className="feature-card__body">
                <p className="feature-card__eyebrow">Scenario library</p>
                <h3>A local catalog built for precise selection.</h3>
                <p>
                  Filter by locale, search titles and descriptions, preview available audio, and carry the
                  selected country and scenario directly into a new session.
                </p>
                <div className="feature-card__facts" aria-label="Library facts">
                  <span>{catalogSummary.scenarioLabel} entries</span>
                  <span>{loading ? "Local locale index" : `${locales.length.toLocaleString()} locales`}</span>
                </div>
                <Link className="feature-card__link" to="/library">
                  Browse scenarios
                  <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
                </Link>
              </div>
            </article>

            <article className="feature-card feature-card--dark">
              <div className="feature-card__topline">
                <span className="feature-card__icon" aria-hidden="true">
                  <Activity size={24} strokeWidth={1.6} />
                </span>
                <span className="feature-card__index">02 / Trace</span>
              </div>
              <div className="feature-card__body">
                <p className="feature-card__eyebrow">Call history</p>
                <h3>Every call stays connected to its reaction.</h3>
                <p>
                  Activity keeps the recipient, scenario, time, and returned audio together so the right reaction
                  is always easy to find.
                </p>
                <div className="feature-card__facts" aria-label="History facts">
                  <span>{localState.accounts.length.toLocaleString()} call connections</span>
                  <span>{localState.launches.length.toLocaleString()} saved calls</span>
                </div>
                <div className="feature-card__links">
                  <Link className="feature-card__link" to="/activity">
                    Open activity
                    <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                  {isAdmin && (
                    <Link className="feature-card__text-link" to="/logs">
                      View API logs
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="workflow-section" aria-labelledby="workflow-title">
        <div className="landing-container">
          <header className="landing-section-heading workflow-heading">
            <p className="landing-kicker">How a session moves</p>
            <h2 id="workflow-title">Four clear steps. One continuous flow.</h2>
            <p>
              Each step carries the same scenario and recipient forward, from first preview to final recording.
            </p>
          </header>

          <ol className="workflow-grid">
            {workflowSteps.map(({ description, icon, number, result, title }) => (
              <li className="workflow-card" key={number}>
                <div className="workflow-card__topline">
                  <span className="workflow-card__index">{number}</span>
                  {createElement(icon, {
                    "aria-hidden": true,
                    className: "workflow-card__icon",
                    size: 22,
                    strokeWidth: 1.6,
                  })}
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="workflow-card__result">{result}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <div className="landing-footer__intro">
            <p className="landing-kicker">Sentinel VOIP</p>
            <h2>Choose the setup. Keep the reaction.</h2>
            <Link className="hero-cta hero-cta--primary" to="/new">
              Start a prank
              <ArrowRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>

          <nav className="landing-footer__links" aria-label="Footer navigation">
            <Link to="/library"><BookOpen size={16} aria-hidden="true" />Library</Link>
            <Link to="/new"><PhoneCall size={16} aria-hidden="true" />New session</Link>
            <Link to="/activity"><Headphones size={16} aria-hidden="true" />Activity</Link>
            {isAdmin && <Link to="/logs"><FileText size={16} aria-hidden="true" />API logs</Link>}
          </nav>

          <div className="landing-footer__meta">
            <p>Use Sentinel only with permission and for a lawful purpose.</p>
            <span>Copyright {new Date().getFullYear()} Sentinel VOIP.</span>
          </div>
        </div>
        <p className="landing-footer__wordmark" aria-hidden="true">SENTINEL.</p>
      </footer>
    </main>
  )
}
